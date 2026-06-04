import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Luăm numele userului logat din localStorage
    const username = localStorage.getItem('username') || 'Anonymous';

    useEffect(() => {
        // Ne conectăm la WebSockets
        socketRef.current = io('https://orthomedapp.onrender.com');

        // Cerem istoricul mesajelor când ne conectăm
        socketRef.current.emit('request-message-history');

        socketRef.current.on('message-history', (history) => {
            setMessages(history);
        });

        // Când primim un mesaj nou
        socketRef.current.on('receive-message', (newMessage) => {
            setMessages((prev) => [...prev, newMessage]);
        });

        return () => socketRef.current.disconnect();
    }, []);

    // Facem auto-scroll la ultimul mesaj
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        // Trimitem mesajul către server
        socketRef.current.emit('send-message', {
            sender: username,
            text: inputText
        });

        setInputText(''); // Golim inputul
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{ position: 'fixed', bottom: '20px', right: '20px', padding: '15px', borderRadius: '50%', backgroundColor: '#2e66ff', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 1000 }}
            >
                💬 Chat
            </button>
        );
    }

    return (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '300px', height: '400px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 5px 20px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden' }}>
            {/* Header Chat */}
            <div style={{ backgroundColor: '#2e66ff', color: 'white', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                <span>Live Chat</span>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✖</button>
            </div>

            {/* Lista Mesaje */}
            <div style={{ flex: 1, padding: '10px', overflowY: 'auto', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map((msg, index) => {
                    const isMe = msg.sender === username;
                    return (
                        <div key={index} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                            <div style={{ fontSize: '10px', color: 'gray', marginBottom: '2px', textAlign: isMe ? 'right' : 'left' }}>{msg.sender}</div>
                            <div style={{ padding: '8px 12px', borderRadius: '12px', backgroundColor: isMe ? '#2e66ff' : '#e5e7eb', color: isMe ? 'white' : 'black', fontSize: '14px' }}>
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Mesaj */}
            <form onSubmit={handleSend} style={{ display: 'flex', padding: '10px', borderTop: '1px solid #eee' }}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '8px', borderRadius: '20px', border: '1px solid #ccc', outline: 'none', paddingLeft: '15px' }}
                />
                <button type="submit" style={{ marginLeft: '10px', backgroundColor: '#2e66ff', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ➤
                </button>
            </form>
        </div>
    );
}