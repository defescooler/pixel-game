import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from src.models.user import db
from src.routes.user import user_bp
import uuid
import time

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'asdf#FGSgvasgf$5$WGT')

# Настройка CORS для продакшн и разработки
allowed_origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:5174",  # Альтернативный порт
    "http://localhost:3000",  # Другие порты разработки
]

# Добавление продакшн URL из переменной окружения
production_url = os.environ.get('FRONTEND_URL')
if production_url:
    allowed_origins.append(production_url)
    # Добавляем также URL без протокола
    if production_url.startswith('https://'):
        allowed_origins.append(production_url.replace('https://', 'http://'))

# Включаем CORS для всех источников в продакшн
if os.environ.get('ENVIRONMENT') == 'production':
    CORS(app, origins="*")
else:
    CORS(app, origins=allowed_origins)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

app.register_blueprint(user_bp, url_prefix='/api')

# Game constants
GAME_WIDTH = int(os.environ.get('GAME_WIDTH', 800))
GAME_HEIGHT = int(os.environ.get('GAME_HEIGHT', 600))
PLAYER_SIZE = int(os.environ.get('PLAYER_SIZE', 4))

# Game state
players = {}  # {session_id: {"id": "player123", "x": 400, "y": 300, "color": "#ff0000", "name": "Player1"}}

# Color palette for players
PLAYER_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
    "#F8C471", "#82E0AA", "#AED6F1", "#D7BDE2", "#F9E79F"
]

def get_player_color(player_index):
    return PLAYER_COLORS[player_index % len(PLAYER_COLORS)]

def get_spawn_position():
    """Get a random spawn position within game bounds"""
    import random
    x = random.randint(PLAYER_SIZE, GAME_WIDTH - PLAYER_SIZE)
    y = random.randint(PLAYER_SIZE, GAME_HEIGHT - PLAYER_SIZE)
    return x, y

@socketio.on('connect')
def handle_connect():
    from flask import request
    session_id = request.sid
    print(f'Player connected: {session_id}')
    
    # Generate player info
    player_id = str(uuid.uuid4())[:8]
    player_index = len(players)
    player_name = f"Player{player_index + 1}"
    player_color = get_player_color(player_index)
    spawn_x, spawn_y = get_spawn_position()
    
    # Store player info
    players[session_id] = {
        "id": player_id,
        "x": spawn_x,
        "y": spawn_y,
        "color": player_color,
        "name": player_name,
        "lastUpdate": int(time.time() * 1000)
    }
    
    # Join the game room
    join_room('game')
    
    # Send initial game state to the new player
    emit('game_state', {
        'players': list(players.values()),
        'yourPlayerId': player_id,
        'gameConfig': {
            'width': GAME_WIDTH,
            'height': GAME_HEIGHT,
            'playerSize': PLAYER_SIZE
        }
    })
    
    # Notify other players about the new player
    emit('player_joined', players[session_id], room='game', include_self=False)
    
    print(f'Player {player_name} joined at ({spawn_x}, {spawn_y})')

@socketio.on('disconnect')
def handle_disconnect():
    from flask import request
    session_id = request.sid
    print(f'Player disconnected: {session_id}')
    
    if session_id in players:
        player_info = players[session_id]
        del players[session_id]
        
        # Notify other players
        emit('player_left', {
            'playerId': player_info['id'],
            'playerName': player_info['name']
        }, room='game')
        
        print(f'Player {player_info["name"]} left the game')
    
    leave_room('game')

@socketio.on('move_player')
def handle_move_player(data):
    from flask import request
    session_id = request.sid
    if session_id not in players:
        return
    
    direction = data.get('direction')
    if direction not in ['up', 'down', 'left', 'right']:
        return
    
    player = players[session_id]
    old_x, old_y = player['x'], player['y']
    
    # Calculate new position
    new_x, new_y = old_x, old_y
    
    if direction == 'up':
        new_y = max(PLAYER_SIZE // 2, old_y - 1)
    elif direction == 'down':
        new_y = min(GAME_HEIGHT - PLAYER_SIZE // 2, old_y + 1)
    elif direction == 'left':
        new_x = max(PLAYER_SIZE // 2, old_x - 1)
    elif direction == 'right':
        new_x = min(GAME_WIDTH - PLAYER_SIZE // 2, old_x + 1)
    
    # Update player position if it changed
    if new_x != old_x or new_y != old_y:
        player['x'] = new_x
        player['y'] = new_y
        player['lastUpdate'] = int(time.time() * 1000)
        
        # Broadcast position update to all players
        emit('player_moved', {
            'playerId': player['id'],
            'x': new_x,
            'y': new_y,
            'timestamp': player['lastUpdate']
        }, room='game')

@socketio.on('update_player_name')
def handle_update_player_name(data):
    from flask import request
    session_id = request.sid
    if session_id not in players:
        return
    
    new_name = data.get('name', '').strip()
    if not new_name or len(new_name) > 20:
        return
    
    old_name = players[session_id]['name']
    players[session_id]['name'] = new_name
    
    # Notify all players about name change
    emit('player_name_changed', {
        'playerId': players[session_id]['id'],
        'oldName': old_name,
        'newName': new_name
    }, room='game')

@socketio.on('get_players_list')
def handle_get_players_list():
    """Send current players list to requesting client"""
    emit('players_list', {
        'players': list(players.values()),
        'count': len(players)
    })

# Обслуживание статических файлов React в продакшн
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

# Проверка здоровья для Railway
@app.route('/health')
def health_check():
    return {"status": "ok", "players": len(players)}, 200

if __name__ == '__main__':
    # Получение порта из переменной окружения для Railway
    port = int(os.environ.get('PORT', 5000))
    
    # Определение режима отладки
    debug = os.environ.get('ENVIRONMENT') != 'production'
    
    # Запуск сервера
    socketio.run(app, host='0.0.0.0', port=port, debug=debug)

