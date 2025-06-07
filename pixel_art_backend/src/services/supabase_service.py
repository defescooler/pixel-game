# src/services/supabase_service.py
import os
from supabase import create_client, Client
from typing import Dict, List, Optional
import uuid
from datetime import datetime, timedelta

class SupabaseService:
    def __init__(self):
        # Замените эти значения на ваши реальные URL и ключи из Supabase Dashboard
        supabase_url = os.getenv('SUPABASE_URL', 'YOUR_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY', 'YOUR_SUPABASE_SERVICE_KEY')
        
        if supabase_url == 'YOUR_SUPABASE_URL' or supabase_key == 'YOUR_SUPABASE_SERVICE_KEY':
            print("Warning: Supabase credentials not configured. Using in-memory storage.")
            self.supabase = None
        else:
            self.supabase: Client = create_client(supabase_url, supabase_key)
    
    def is_enabled(self) -> bool:
        """Проверяет, настроен ли Supabase"""
        return self.supabase is not None
    
    async def add_player(self, session_id: str, player_data: Dict) -> Optional[Dict]:
        """Добавляет нового игрока в базу данных"""
        if not self.is_enabled():
            return None
        
        try:
            player = {
                'session_id': session_id,
                'name': player_data.get('name', 'Player'),
                'x': player_data.get('x', 400),
                'y': player_data.get('y', 300),
                'color': player_data.get('color', '#FF6B6B'),
                'last_update': datetime.now().isoformat()
            }
            
            result = self.supabase.table('players').insert(player).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            print(f"Error adding player to Supabase: {e}")
            return None
    
    async def update_player_position(self, session_id: str, x: int, y: int) -> Optional[Dict]:
        """Обновляет позицию игрока"""
        if not self.is_enabled():
            return None
        
        try:
            result = self.supabase.table('players').update({
                'x': x,
                'y': y,
                'last_update': datetime.now().isoformat()
            }).eq('session_id', session_id).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            print(f"Error updating player position in Supabase: {e}")
            return None
    
    async def update_player_name(self, session_id: str, name: str) -> Optional[Dict]:
        """Обновляет имя игрока"""
        if not self.is_enabled():
            return None
        
        try:
            result = self.supabase.table('players').update({
                'name': name,
                'last_update': datetime.now().isoformat()
            }).eq('session_id', session_id).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            print(f"Error updating player name in Supabase: {e}")
            return None
    
    async def remove_player(self, session_id: str) -> bool:
        """Удаляет игрока из базы данных"""
        if not self.is_enabled():
            return False
        
        try:
            result = self.supabase.table('players').delete().eq('session_id', session_id).execute()
            return True
            
        except Exception as e:
            print(f"Error removing player from Supabase: {e}")
            return False
    
    async def get_all_players(self) -> List[Dict]:
        """Получает всех активных игроков"""
        if not self.is_enabled():
            return []
        
        try:
            result = self.supabase.table('players').select('*').order('created_at').execute()
            return result.data if result.data else []
            
        except Exception as e:
            print(f"Error fetching players from Supabase: {e}")
            return []
    
    async def cleanup_inactive_players(self) -> bool:
        """Удаляет неактивных игроков (старше 5 минут)"""
        if not self.is_enabled():
            return False
        
        try:
            five_minutes_ago = (datetime.now() - timedelta(minutes=5)).isoformat()
            
            result = self.supabase.table('players').delete().lt('last_update', five_minutes_ago).execute()
            return True
            
        except Exception as e:
            print(f"Error cleaning up inactive players in Supabase: {e}")
            return False
    
    async def get_player_by_session(self, session_id: str) -> Optional[Dict]:
        """Получает игрока по session_id"""
        if not self.is_enabled():
            return None
        
        try:
            result = self.supabase.table('players').select('*').eq('session_id', session_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            print(f"Error fetching player from Supabase: {e}")
            return None

# Глобальный экземпляр сервиса
supabase_service = SupabaseService()

