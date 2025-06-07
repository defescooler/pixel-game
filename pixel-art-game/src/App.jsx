import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Users, Gamepad2, Wifi, WifiOff } from 'lucide-react'
import './App.css'

const GAME_CONFIG = {
  width: 800,
  height: 600,
  playerSize: 4
}

function App() {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [players, setPlayers] = useState([])
  const [yourPlayerId, setYourPlayerId] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  
  const canvasRef = useRef(null)
  const keysPressed = useRef(new Set())
  const animationFrameRef = useRef(null)

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000')
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server')
      setConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server')
      setConnected(false)
    })

    newSocket.on('game_state', (data) => {
      console.log('Received game state:', data)
      setPlayers(data.players)
      setYourPlayerId(data.yourPlayerId)
      
      // Set initial player name
      const yourPlayer = data.players.find(p => p.id === data.yourPlayerId)
      if (yourPlayer) {
        setPlayerName(yourPlayer.name)
      }
    })

    newSocket.on('player_joined', (player) => {
      console.log('Player joined:', player)
      setPlayers(prev => [...prev, player])
    })

    newSocket.on('player_left', (data) => {
      console.log('Player left:', data)
      setPlayers(prev => prev.filter(p => p.id !== data.playerId))
    })

    newSocket.on('player_moved', (data) => {
      setPlayers(prev => prev.map(p => 
        p.id === data.playerId 
          ? { ...p, x: data.x, y: data.y }
          : p
      ))
    })

    newSocket.on('player_name_changed', (data) => {
      setPlayers(prev => prev.map(p => 
        p.id === data.playerId 
          ? { ...p, name: data.newName }
          : p
      ))
      
      if (data.playerId === yourPlayerId) {
        setPlayerName(data.newName)
      }
    })

    return () => {
      newSocket.close()
    }
  }, [yourPlayerId])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault()
        keysPressed.current.add(key)
      }
    }

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault()
        keysPressed.current.delete(key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Game loop for movement
  useEffect(() => {
    if (!connected || !socket) return

    const gameLoop = () => {
      if (keysPressed.current.size > 0) {
        keysPressed.current.forEach(key => {
          let direction = ''
          switch (key) {
            case 'w': direction = 'up'; break
            case 's': direction = 'down'; break
            case 'a': direction = 'left'; break
            case 'd': direction = 'right'; break
          }
          
          if (direction) {
            socket.emit('move_player', { direction })
          }
        })
      }
      
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [socket, connected])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    // Clear canvas
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height)
    
    // Draw grid (optional)
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= GAME_CONFIG.width; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, GAME_CONFIG.height)
      ctx.stroke()
    }
    for (let y = 0; y <= GAME_CONFIG.height; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(GAME_CONFIG.width, y)
      ctx.stroke()
    }
    
    // Draw players
    players.forEach(player => {
      ctx.fillStyle = player.color
      ctx.fillRect(
        player.x - GAME_CONFIG.playerSize / 2,
        player.y - GAME_CONFIG.playerSize / 2,
        GAME_CONFIG.playerSize,
        GAME_CONFIG.playerSize
      )
      
      // Draw player name
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(
        player.name,
        player.x,
        player.y - 8
      )
      
      // Highlight your player
      if (player.id === yourPlayerId) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.strokeRect(
          player.x - GAME_CONFIG.playerSize / 2 - 2,
          player.y - GAME_CONFIG.playerSize / 2 - 2,
          GAME_CONFIG.playerSize + 4,
          GAME_CONFIG.playerSize + 4
        )
      }
    })
  }, [players, yourPlayerId])

  const handleNameSubmit = () => {
    if (nameInput.trim() && socket) {
      socket.emit('update_player_name', { name: nameInput.trim() })
      setShowNameInput(false)
      setNameInput('')
    }
  }

  const yourPlayer = players.find(p => p.id === yourPlayerId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Многопользовательская 2D игра
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span>Подключено</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span>Отключено</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{players.length} игроков онлайн</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Canvas */}
          <div className="lg:col-span-3">
            <Card className="bg-black/20 backdrop-blur-sm border-gray-700">
              <CardContent className="p-4">
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    width={GAME_CONFIG.width}
                    height={GAME_CONFIG.height}
                    className="border border-gray-600 rounded-lg bg-gray-900 w-full max-w-full"
                    style={{ aspectRatio: `${GAME_CONFIG.width}/${GAME_CONFIG.height}` }}
                  />
                  
                  {/* Controls overlay */}
                  <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Gamepad2 className="w-4 h-4" />
                      <span>Управление:</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div></div>
                      <Badge variant="outline" className="text-center">W</Badge>
                      <div></div>
                      <Badge variant="outline" className="text-center">A</Badge>
                      <Badge variant="outline" className="text-center">S</Badge>
                      <Badge variant="outline" className="text-center">D</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Player Info */}
            <Card className="bg-black/20 backdrop-blur-sm border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Ваш игрок</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {yourPlayer && (
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded border-2 border-white"
                      style={{ backgroundColor: yourPlayer.color }}
                    ></div>
                    <div>
                      <div className="text-white font-medium">{yourPlayer.name}</div>
                      <div className="text-gray-400 text-sm">
                        ({Math.round(yourPlayer.x)}, {Math.round(yourPlayer.y)})
                      </div>
                    </div>
                  </div>
                )}
                
                {showNameInput ? (
                  <div className="space-y-2">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Введите имя"
                      className="bg-gray-800 border-gray-600 text-white"
                      maxLength={20}
                      onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleNameSubmit}>
                        Сохранить
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setShowNameInput(false)}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowNameInput(true)}
                    className="w-full"
                  >
                    Изменить имя
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Players List */}
            <Card className="bg-black/20 backdrop-blur-sm border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  Игроки онлайн ({players.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {players.map(player => (
                    <div 
                      key={player.id}
                      className={`flex items-center gap-3 p-2 rounded ${
                        player.id === yourPlayerId 
                          ? 'bg-blue-500/20 border border-blue-500/30' 
                          : 'bg-gray-800/50'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded border border-gray-400"
                        style={{ backgroundColor: player.color }}
                      ></div>
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">
                          {player.name}
                          {player.id === yourPlayerId && (
                            <span className="text-blue-400 ml-1">(вы)</span>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {Math.round(player.x)}, {Math.round(player.y)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

