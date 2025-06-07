# Развертывание многопользовательской игры на Vercel

## Проблема

Vercel отлично подходит для развертывания React приложений, но имеет ограничения для WebSocket серверов. Flask backend с Socket.IO не может работать на Vercel из-за:

1. Vercel использует serverless функции, которые не поддерживают постоянные WebSocket соединения
2. Нет поддержки долгоживущих процессов
3. Ограничения по времени выполнения функций

## Решения для развертывания

### Вариант 1: Frontend на Vercel + Backend на Railway/Render

#### 1.1 Развертывание Frontend на Vercel

1. **Подготовка проекта:**
```bash
cd pixel-art-game
```

2. **Создание vercel.json:**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

3. **Обновление конфигурации для продакшн:**
В `src/App.jsx` замените:
```javascript
const newSocket = io('http://localhost:5000')
```
на:
```javascript
const newSocket = io(process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.railway.app' 
  : 'http://localhost:5000')
```

4. **Развертывание на Vercel:**
```bash
npm install -g vercel
vercel --prod
```

#### 1.2 Развертывание Backend на Railway

1. **Создание аккаунта на Railway.app**

2. **Подготовка backend для Railway:**
Создайте `Procfile` в `pixel_art_backend/`:
```
web: python src/main.py
```

3. **Обновление main.py для продакшн:**
```python
import os

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
```

4. **Развертывание:**
- Подключите GitHub репозиторий к Railway
- Railway автоматически развернет backend
- Получите URL вашего backend

### Вариант 2: Полное развертывание на Railway

1. **Создание монорепозитория:**
```bash
mkdir multiplayer-game-deploy
cd multiplayer-game-deploy
cp -r pixel-art-game frontend/
cp -r pixel_art_backend backend/
```

2. **Создание railway.json:**
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "python backend/src/main.py",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "always"
  }
}
```

3. **Настройка статических файлов в Flask:**
В `backend/src/main.py` добавьте:
```python
# Обслуживание статических файлов React
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    if path != "" and os.path.exists(os.path.join('frontend/dist', path)):
        return send_from_directory('frontend/dist', path)
    else:
        return send_from_directory('frontend/dist', 'index.html')
```

### Вариант 3: Использование Vercel Functions (ограниченно)

Создайте `api/socket.py` в корне проекта:
```python
from flask import Flask
from flask_socketio import SocketIO
import os

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Ваш код WebSocket здесь...

if __name__ == '__main__':
    socketio.run(app)
```

И `vercel.json`:
```json
{
  "functions": {
    "api/socket.py": {
      "runtime": "python3.9"
    }
  },
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/socket.py" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

**Примечание:** Этот вариант имеет ограничения по времени выполнения.

## Рекомендуемое решение

### Пошаговое развертывание (Frontend на Vercel + Backend на Railway)

#### Шаг 1: Подготовка кода

1. **Обновите App.jsx:**
```javascript
// В начале файла добавьте
const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_BACKEND_URL || 'https://your-app.railway.app'
  : 'http://localhost:5000'

// Замените строку подключения
const newSocket = io(BACKEND_URL)
```

2. **Создайте .env.local в frontend:**
```
REACT_APP_BACKEND_URL=https://your-backend.railway.app
```

#### Шаг 2: Развертывание Backend на Railway

1. Зайдите на [railway.app](https://railway.app)
2. Создайте новый проект
3. Подключите GitHub репозиторий
4. Выберите папку `pixel_art_backend`
5. Railway автоматически развернет приложение
6. Скопируйте URL вашего backend

#### Шаг 3: Развертывание Frontend на Vercel

1. Обновите `REACT_APP_BACKEND_URL` в `.env.local`
2. Зайдите на [vercel.com](https://vercel.com)
3. Импортируйте проект из GitHub
4. Выберите папку `pixel-art-game`
5. Добавьте переменную окружения `REACT_APP_BACKEND_URL`
6. Разверните проект

## Альтернативные платформы

### Для Backend:
- **Railway** (рекомендуется) - простое развертывание
- **Render** - бесплатный tier
- **Heroku** - классический выбор
- **DigitalOcean App Platform** - надежный вариант

### Для Frontend:
- **Vercel** (рекомендуется) - отличная производительность
- **Netlify** - хорошая альтернатива
- **GitHub Pages** - бесплатный вариант

## Готовые конфигурации

Я могу создать готовые конфигурационные файлы для развертывания на различных платформах. Какой вариант вас больше интересует?

## Troubleshooting

### CORS ошибки
Убедитесь, что в backend настроены правильные CORS origins:
```python
CORS(app, origins=["https://your-frontend.vercel.app", "http://localhost:3000"])
```

### WebSocket соединение не устанавливается
Проверьте, что backend поддерживает WebSocket и правильно настроен для продакшн.

