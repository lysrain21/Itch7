import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { MemoryButton } from './MemoryButton';
import { chatService } from '../api/chatService';

// 移除内存库选择器样式，因为不再需要
const ChatContainer = styled(motion.div)`
  background: rgba(255, 255, 255, 0.2);
  border: ${({ theme }) => theme.borders.glass};
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  height: 600px;
  backdrop-filter: ${({ theme }) => theme.blur.heavy};
  box-shadow: ${({ theme }) => theme.shadows.soft};
  display: flex;
  flex-direction: column;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const MessageBubble = styled.div<{ isUser: boolean }>`
  background: ${({ isUser, theme }) =>
    isUser ? "rgba(216, 180, 254, 0.3)" : "rgba(152, 245, 225, 0.3)"};
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 18px;
  border-radius: 15px;
  backdrop-filter: ${({ theme }) => theme.blur.light};
  position: relative;
  align-self: ${({ isUser }) => (isUser ? "flex-end" : "flex-start")};
  max-width: 80%;
  white-space: pre-wrap;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 15px;
    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.2);
  }
`;

const InputContainer = styled.div`
  display: flex;
  padding: 20px;
  gap: 10px;
`;

const InputField = styled.textarea`
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.primary};
  padding: 10px;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.secondary};
  border-radius: 5px;
  resize: none;
  min-height: 40px;
  max-height: 100px;
`;

const SendButton = styled(MemoryButton)`
  padding: 10px 20px;
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  color: ${({ theme }) => theme.colors.text};
  font-style: italic;
  
  span {
    margin-right: 5px;
  }
  
  .dot {
    width: 6px;
    height: 6px;
    background: ${({ theme }) => theme.colors.primary};
    border-radius: 50%;
    display: inline-block;
    margin: 0 2px;
    animation: bounce 1.4s infinite ease-in-out;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }
  
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
`;

// 修改Message接口，使id可以是number或string
interface Message {
  id: number | string;
  text: string;
  isUser: boolean;
  pending?: boolean;
}

export const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputText.trim(),
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const tempId = Date.now().toString();
      // Add user message first
      setMessages(prev => [...prev, { id: tempId, isUser: false, text: '', pending: true }]);
      setIsTyping(true);

      // Setup for response text
      let responseText = '';

      // Call API with streaming - 传递用户消息的文本内容
      await chatService.sendMessageStream(
        userMessage.text, // 修改这里，传递消息文本而不是整个消息对象
        (chunk: string) => {
          responseText += chunk;
          setMessages(prev => prev.map(msg =>
            msg.id === tempId ? { ...msg, text: responseText } : msg
          ));
        },
        () => {
          setMessages(prev => prev.map(msg =>
            msg.id === tempId ? { ...msg, pending: false } : msg
          ));
          setIsTyping(false);
        },
        (error: Error) => {
          console.error('聊天请求错误:', error);
          setIsTyping(false);
          setMessages(prev => prev.map(msg =>
            msg.id === tempId ? { ...msg, text: '抱歉，发生了错误。请稍后再试。' } : msg
          ));
        }
      );

    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ChatContainer
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <MessagesContainer>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            isUser={message.isUser}
          >
            {message.text}
          </MessageBubble>
        ))}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <InputField
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="输入神经讯号..."
          disabled={isTyping}
          rows={1}
        />
        <SendButton
          onClick={handleSend}
          disabled={isTyping || !inputText.trim()}
        >
          发送
        </SendButton>
      </InputContainer>

      {isTyping && (
        <TypingIndicator>
          <span>ITCH-7思考中</span>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </TypingIndicator>
      )}
    </ChatContainer>
  );
};