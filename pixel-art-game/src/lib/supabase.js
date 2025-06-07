// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

// Замените эти значения на ваши реальные URL и ключи из Supabase Dashboard
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Функции для работы с игроками
export const gameService = {
  // Подписка на изменения игроков в реальном времени
  subscribeToPlayers: (callback) => {
    return supabase
      .channel('players')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players' }, 
        callback
      )
      .subscribe()
  },

  // Добавление нового игрока
  addPlayer: async (player) => {
    const { data, error } = await supabase
      .from('players')
      .insert([player])
      .select()
    
    if (error) {
      console.error('Error adding player:', error)
      return null
    }
    return data[0]
  },

  // Обновление позиции игрока
  updatePlayerPosition: async (playerId, x, y) => {
    const { data, error } = await supabase
      .from('players')
      .update({ x, y, last_update: new Date().toISOString() })
      .eq('id', playerId)
      .select()
    
    if (error) {
      console.error('Error updating player position:', error)
      return null
    }
    return data[0]
  },

  // Обновление имени игрока
  updatePlayerName: async (playerId, name) => {
    const { data, error } = await supabase
      .from('players')
      .update({ name, last_update: new Date().toISOString() })
      .eq('id', playerId)
      .select()
    
    if (error) {
      console.error('Error updating player name:', error)
      return null
    }
    return data[0]
  },

  // Удаление игрока
  removePlayer: async (playerId) => {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)
    
    if (error) {
      console.error('Error removing player:', error)
      return false
    }
    return true
  },

  // Получение всех активных игроков
  getActivePlayers: async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching players:', error)
      return []
    }
    return data
  },

  // Очистка неактивных игроков (старше 5 минут)
  cleanupInactivePlayers: async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { error } = await supabase
      .from('players')
      .delete()
      .lt('last_update', fiveMinutesAgo)
    
    if (error) {
      console.error('Error cleaning up inactive players:', error)
      return false
    }
    return true
  }
}

