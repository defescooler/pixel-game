# Как запустить многопользовательскую игру локально

## Предварительные требования

- **Python 3.11+** (для backend)
- **Node.js 18+** (для frontend)
- **pnpm** (менеджер пакетов для Node.js)

## Шаг 1: Распаковка архива

```bash
unzip multiplayer-game.zip
cd multiplayer-game
```

## Шаг 2: Запуск Backend сервера

### 2.1 Переход в директорию backend
```bash
cd pixel_art_backend
```

### 2.2 Создание виртуального окружения (если не существует)
```bash
python3 -m venv venv
```

### 2.3 Активация виртуального окружения

**На Linux/Mac:**
```bash
source venv/bin/activate
```

**На Windows:**
```bash
venv\Scripts\activate
```

### 2.4 Установка зависимостей
```bash
pip install -r requirements.txt
```

### 2.5 Запуск сервера
```bash
python src/main.py
```

✅ Backend будет запущен на `http://localhost:5000`

## Шаг 3: Запуск Frontend приложения

### 3.1 Открытие нового терминала и переход в директорию frontend
```bash
cd pixel-art-game
```

### 3.2 Установка pnpm (если не установлен)
```bash
npm install -g pnpm
```

### 3.3 Установка зависимостей
```bash
pnpm install
```

### 3.4 Запуск приложения
```bash
pnpm run dev
```

✅ Frontend будет запущен на `http://localhost:5173`

## Шаг 4: Открытие игры

1. Откройте браузер
2. Перейдите на `http://localhost:5173`
3. Игра готова к использованию!

## Тестирование многопользовательского режима

Для тестирования синхронизации между игроками:

1. Откройте несколько вкладок браузера с `http://localhost:5173`
2. В каждой вкладке будет создан новый игрок
3. Движения в одной вкладке будут видны в других в реальном времени

## Управление игрой

- **W** - движение вверх
- **A** - движение влево
- **S** - движение вниз
- **D** - движение вправо
- **Кнопка "Изменить имя"** - смена имени игрока

## Устранение неполадок

### Backend не запускается
```bash
# Проверьте версию Python
python --version

# Убедитесь, что виртуальное окружение активировано
which python  # должно показать путь к venv

# Проверьте, свободен ли порт 5000
lsof -i :5000  # на Mac/Linux
netstat -an | findstr :5000  # на Windows
```

### Frontend не подключается
```bash
# Проверьте версию Node.js
node --version

# Убедитесь, что backend запущен
curl http://localhost:5000

# Проверьте консоль браузера на ошибки
# F12 -> Console
```

### Порты заняты
Если порты заняты, можете изменить их:

**Backend (в src/main.py):**
```python
socketio.run(app, host='0.0.0.0', port=5001, debug=True)  # изменить на 5001
```

**Frontend (в src/App.jsx):**
```javascript
const newSocket = io('http://localhost:5001')  // изменить на 5001
```

## Дополнительные возможности

### Интеграция с Supabase
Для использования Supabase вместо локального хранения:
1. Следуйте инструкциям в `SUPABASE_SETUP.md`
2. Настройте переменные окружения
3. Перезапустите приложение

### Развертывание в продакшн
```bash
# Сборка frontend для продакшн
cd pixel-art-game
pnpm run build

# Настройка переменных окружения для backend
# Создайте .env файл в pixel_art_backend/
```

## Структура проекта после распаковки

```
multiplayer-game/
├── pixel-art-game/          # React frontend
├── pixel_art_backend/       # Flask backend  
├── README.md               # Основная документация
├── SUPABASE_SETUP.md       # Инструкции по Supabase
└── supabase_setup.sql      # SQL скрипт для БД
```

Если у вас возникнут проблемы, проверьте логи в терминале и консоли браузера для диагностики ошибок.

