from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
from eth_account import Account
import os
from cryptography.fernet import Fernet
import base64
from web3 import Web3
from dotenv import load_dotenv
from models import db, User
import requests

load_dotenv()
app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://wallet:wallet@localhost:5432/wallet'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Sekretny klucz do JWT (w praktyce trzymaj go w ENV)
app.config['JWT_SECRET_KEY'] = 'super-secret-key'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)  # ważność tokena

db.init_app(app)
jwt = JWTManager(app)

ENCRYPTION_SECRET = os.getenv('ENCRYPTION_SECRET')

if not ENCRYPTION_SECRET:
    raise RuntimeError("Brakuje klucza szyfrowania ENCRYPTION_SECRET w ENV!")

fernet = Fernet(ENCRYPTION_SECRET.encode())

INFURA_PROJECT_ID = os.getenv('INFURA_PROJECT_ID')

if not INFURA_PROJECT_ID:
    raise RuntimeError("Brakuje INFURA_PROJECT_ID w ENV!")

ETHERSCAN_API_KEY = os.getenv('ETHERSCAN_API_KEY')

if not ETHERSCAN_API_KEY:
    raise RuntimeError("Brakuje klucza ETHERSCAN_API_KEY w ENV!")

w3 = Web3(Web3.HTTPProvider(f'https://sepolia.infura.io/v3/{INFURA_PROJECT_ID}'))  # lub inny provider


def generate_eth_wallet():
    account = Account.create()
    encrypted_private_key = fernet.encrypt(account.key)  # account.key to bytes

    return {
        'address': account.address,  # np. "0xabc123..."
        'private_key_encrypted': encrypted_private_key.decode()  # zapisujemy jako string
    }


@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'error': 'Username, email and password are required'}), 400

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({'error': 'User with that username or email already exists'}), 409

    wallet = generate_eth_wallet()

    new_user = User(
        username=username,
        email=email,
        eth_address=wallet['address'],
        private_key_encrypted=wallet['private_key_encrypted']
    )
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        'message': 'User registered successfully',
        'wallet_address': wallet['address']
    }), 201


# Nowy endpoint do logowania
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401

    # Tworzymy token JWT
    access_token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': access_token}), 200


# Przykładowy chroniony endpoint
@app.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'username': user.username,
        'email': user.email
    }), 200


@app.route('/private_key', methods=['GET'])
@jwt_required()
def get_private_key():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    try:
        decrypted_key = fernet.decrypt(user.private_key_encrypted.encode()).decode()
    except Exception as e:
        return jsonify({'error': 'Could not decrypt private key'}), 500

    return jsonify({'private_key': decrypted_key}), 200


@app.route('/sign_transaction', methods=['POST'])
@jwt_required()
def sign_and_maybe_send_transaction():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.json
    to_address = data.get('to')
    value = data.get('value')  # w wei
    gas = data.get('gas', 21000)
    gas_price = data.get('gasPrice')
    nonce = data.get('nonce')  # można też automatycznie pobrać
    chain_id = data.get('chainId', 11155111)  # Sepolia chain id
    broadcast = data.get('broadcast', False)

    # Walidacja danych
    if not to_address or value is None or gas_price is None:
        return jsonify({'error': 'Missing required transaction parameters'}), 400

    try:
        private_key = fernet.decrypt(user.private_key_encrypted.encode())
    except Exception:
        return jsonify({'error': 'Could not decrypt private key'}), 500

    try:
        # Automatyczne pobranie nonce jeśli nie podano
        if nonce is None:
            nonce = w3.eth.get_transaction_count(user.eth_address)

        tx = {
            'to': to_address,
            'value': int(value),
            'gas': int(gas),
            'gasPrice': int(gas_price),
            'nonce': int(nonce),
            'chainId': int(chain_id)
        }

        signed_tx = Account.sign_transaction(tx, private_key)
        raw_tx_hex = signed_tx.raw_transaction.hex()

        if broadcast:
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            return jsonify({
                'message': 'Transaction sent successfully',
                'tx_hash': tx_hash.hex()
            }), 200
        else:
            return jsonify({
                'message': 'Transaction signed successfully',
                'signed_tx': raw_tx_hex
            }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to sign/send transaction: {str(e)}'}), 500


@app.route('/balance', methods=['GET'])
@jwt_required()
def get_balance():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    balance_wei = w3.eth.get_balance(user.eth_address)
    balance_eth = int(balance_wei) / 1e18

    return jsonify({'balance': str(balance_eth)}), 200


@app.route('/transaction_history', methods=['GET'])
@jwt_required()
def transaction_history():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    address = user.eth_address.lower()

    url = (
        f'https://api.etherscan.io/v2/api'
        f'?chainid=11155111'
        f'&module=account'
        f'&action=txlist'
        f'&address={address}'
        f'&startblock=0'
        f'&endblock=99999999'
        f'&page=1'
        f'&offset=10'
        f'&sort=asc'
        f'&apikey={ETHERSCAN_API_KEY}'
    )

    try:
        # User-Agent by uniknąć blokad
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
        if response.status_code != 200:
            return jsonify({'error': f'HTTP Error {response.status_code}', 'body': response.text}), 502

        data = response.json()

        if data.get('status') != '1':
            # status 0 oznacza brak transakcji lub błąd (np. limit API)
            return jsonify({'message': 'No transactions found or failed to fetch'}), 200

        txs = data.get('result', [])

        formatted = []
        for tx in txs:
            direction = "outgoing" if tx['from'].lower() == address else "incoming"
            formatted.append({
                'hash': tx['hash'],
                'from': tx['from'],
                'to': tx['to'],
                'value_wei': tx['value'],
                'value_eth': str(int(tx['value']) / 1e18),
                'timestamp': int(tx['timeStamp']),
                'blockNumber': tx['blockNumber'],
                'gasUsed': tx['gasUsed'],
                'gasPrice': tx['gasPrice'],
                'is_error': tx['isError'],
                'direction': direction
            })

        return jsonify({'transactions': formatted}), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch transaction history: {str(e)}'}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
