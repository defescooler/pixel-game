-- SQL скрипт для создания таблицы игроков в Supabase
-- Выполните этот скрипт в SQL Editor вашего Supabase проекта

-- Создание таблицы игроков
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL DEFAULT 'Player',
    x INTEGER NOT NULL DEFAULT 400,
    y INTEGER NOT NULL DEFAULT 300,
    color VARCHAR(7) NOT NULL DEFAULT '#FF6B6B',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_players_session_id ON players(session_id);
CREATE INDEX IF NOT EXISTS idx_players_last_update ON players(last_update);

-- Включение Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Политики безопасности (разрешить всем читать и изменять)
CREATE POLICY "Allow all operations on players" ON players
    FOR ALL USING (true) WITH CHECK (true);

-- Включение Realtime для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- Функция для автоматической очистки неактивных игроков
CREATE OR REPLACE FUNCTION cleanup_inactive_players()
RETURNS void AS $$
BEGIN
    DELETE FROM players 
    WHERE last_update < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Создание задачи для периодической очистки (опционально)
-- Примечание: pg_cron расширение должно быть включено в Supabase
-- SELECT cron.schedule('cleanup-inactive-players', '*/5 * * * *', 'SELECT cleanup_inactive_players();');

-- Триггер для автоматического обновления last_update
CREATE OR REPLACE FUNCTION update_last_update_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_update = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_players_last_update
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_last_update_column();

