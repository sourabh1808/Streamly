import { useState, useEffect, useRef } from 'react';
import socketService from '../utils/socket';
import { Send } from 'lucide-react';

export default function Chat({ studioId, participantName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const socket = socketService.getSocket();

    socket.on('chat-message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    return () => {
      socket.off('chat-message');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    socketService.emit('chat-message', {
      studioId,
      message: newMessage,
      senderName: participantName
    });

    setNewMessage('');
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-primary-400">
                  {msg.senderName}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-200">{msg.message}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
