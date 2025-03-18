import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MemoryButton } from './MemoryButton';
import { chatService } from '../api/chatService';
import { memoryService } from '../api/memoryService';

const GameOverModal = styled(motion.div)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid ${({ theme }) => theme.colors.primary};
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 0 30px rgba(255, 182, 193, 0.5);
  z-index: 100;
  backdrop-filter: blur(10px);
`;

const GameOverTitle = styled.h2`
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 20px;
  text-shadow: 0 0 5px ${({ theme }) => theme.colors.primary};
`;

const GameOverText = styled.p`
  color: white;
  margin-bottom: 20px;
  line-height: 1.5;
`;

const GameOverButton = styled(MemoryButton)`
  background: rgba(255, 255, 255, 0.2);
  margin-top: 10px;
  padding: 10px 20px;
  &:hover {
    background: rgba(255, 182, 193, 0.3);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
`;

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  z-index: 90;
`;

const TimerDisplay = styled.div<{ isAngry: boolean }>`
  position: absolute;
  top: 10px;
  right: 20px;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 10px;
  background: ${({ isAngry }) =>
    isAngry ? 'rgba(255, 100, 100, 0.3)' : 'rgba(255, 255, 255, 0.2)'};
  color: ${({ isAngry, theme }) =>
    isAngry ? '#ff5555' : theme.colors.text};
  transition: all 0.5s ease;
  
  ${({ isAngry }) => isAngry && `
    box-shadow: 0 0 8px rgba(255, 0, 0, 0.5);
    animation: pulse 1.5s infinite;
  `}
  
  @keyframes pulse {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }
`;

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

const SystemMessage = styled.div`
  background: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.8);
  padding: 8px 12px;
  border-radius: 10px;
  font-style: italic;
  text-align: center;
  margin: 10px 0;
  font-size: 0.9em;
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

// 修改Message接口，增加系统消息标志
interface Message {
  id: number | string;
  text: string;
  isUser: boolean;
  pending?: boolean;
  isSystem?: boolean;  // 添加系统消息标志
}


// 定义游戏总时长和阶段
const TOTAL_GAME_TIME = 14 * 60 * 10; // 14分钟，单位毫秒
const ANGER_THRESHOLD = (6 / 7) * TOTAL_GAME_TIME; // 第6年结束的时间点
const YEAR_DURATION = TOTAL_GAME_TIME / 7; // 每"年"的持续时间
const BREAKUP_MESSAGE = "我们分手吧。"; // AI的分手消息


export const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false); // 控制游戏结束弹窗
  const [isResetting, setIsResetting] = useState(false); // 控制重置状态
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 计时器相关状态
  const [timer, setTimer] = useState(0);
  const [isAngry, setIsAngry] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [gameOver, setGameOver] = useState(false);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 添加计时器逻辑
  useEffect(() => {
    if (timerActive && !gameOver) {
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          const newTime = prev + 1000;

          // 检查是否到达第七年
          if (newTime >= ANGER_THRESHOLD && !isAngry) {
            setIsAngry(true);
            // 可以添加一个系统消息表示关系变化
            setMessages(prev => [...prev, {
              id: Date.now(),
              text: "关系进入第七年，你感觉到了微妙的变化...",
              isUser: false,
              isSystem: true
            }]);
          }

          // 检查游戏是否结束
          if (newTime >= TOTAL_GAME_TIME) {
            setGameOver(true);
            setTimerActive(false);

            // 添加AI的分手消息
            setMessages(prev => [...prev, {
              id: Date.now(),
              text: BREAKUP_MESSAGE,
              isUser: false,
              pending: false
            }]);

            // 添加游戏结束消息
            setMessages(prev => [...prev, {
              id: Date.now() + 1,
              text: "七年之痒体验已结束。",
              isUser: false,
              isSystem: true
            }]);

            // 显示游戏结束弹窗
            setTimeout(() => {
              setShowGameOver(true);
            }, 2000);

            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
          }

          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    // 清理函数
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive, isAngry, gameOver]);

  // 计算当前是第几年
  const getCurrentYear = (ms: number) => {
    return Math.min(7, Math.floor(ms / YEAR_DURATION) + 1);
  };

  // 计算当前年内的时间
  const getTimeInYear = (ms: number) => {
    const yearProgress = ms % YEAR_DURATION;
    const seconds = Math.floor((yearProgress / 1000) % 60);
    const minutes = Math.floor(yearProgress / 60000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  // 添加启动计时器函数
  const startTimer = () => {
    if (!timerActive && !gameOver) {
      setTimerActive(true);
    }
  };


  const handleSend = async () => {
    if (!inputText.trim()) return;

    // 启动计时器
    startTimer();

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

      // 修改API调用，传递愤怒状态
      await chatService.sendMessageStream(
        userMessage.text,
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
        },
        isAngry // 传递愤怒状态给API
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

  // 重置游戏函数
  const resetGame = async () => {
    try {
      setIsResetting(true);
      console.log("正在重置游戏...");

      // 尝试调用API重置用户的数据库
      try {
        await memoryService.resetMemory();
        console.log("记忆库重置成功");
      } catch (apiError) {
        console.error("重置记忆库API调用失败:", apiError);
      }

      // 添加欢迎消息
      setMessages([{
        id: Date.now(),
        text: "正在重置游戏，请稍候...",
        isUser: false,
        isSystem: true
      }]);

      // 使用强制刷新方法，不带缓存
      console.log("强制刷新页面...");
      setTimeout(() => {
        // 方法1：添加随机参数防止缓存
        window.location.href = window.location.origin + window.location.pathname + "?t=" + new Date().getTime();

        // 如果上面的方法不起作用，可以尝试下面的备用方法
        // 方法2：强制硬刷新
        // window.location.reload(true);
      }, 1000);

    } catch (error) {
      console.error("重置游戏流程失败:", error);

      // 使用最直接的方式强制刷新
      window.location.replace(window.location.href);
    }
  };

  return (
    <ChatContainer
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* 显示当前年份和时间 */}
      {timerActive && (
        <TimerDisplay isAngry={isAngry}>
          {isAngry ? '第七年' : `第${getCurrentYear(timer)}年`} {getTimeInYear(timer)}
        </TimerDisplay>
      )}

      <MessagesContainer>
        {messages.map((message) => (
          message.isSystem ? (
            <SystemMessage key={message.id}>
              {message.text}
            </SystemMessage>
          ) : (
            <MessageBubble
              key={message.id}
              isUser={message.isUser}
            >
              {message.text}
            </MessageBubble>
          )
        ))}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <InputContainer>
        <InputField
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={isAngry ? "你想说些什么..." : "说点什么..."}
          disabled={isTyping || gameOver}
          rows={1}
        />
        <SendButton
          onClick={handleSend}
          disabled={isTyping || !inputText.trim() || gameOver}
        >
          发送
        </SendButton>
      </InputContainer>

      {isTyping && (
        <TypingIndicator>
          <span>{isAngry ? "思考你的话..." : "正在回复..."}</span>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </TypingIndicator>
      )}

      {/* 游戏结束弹窗 */}
      <AnimatePresence>
        {showGameOver && (
          <>
            <Overlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <GameOverModal
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <GameOverTitle>GAME OVER</GameOverTitle>
              <GameOverText>
                七年之痒体验已结束。<br />
                你的关系因七年之痒而破裂了。<br />
                要重新开始新的感情旅程吗？
              </GameOverText>
              <ButtonContainer>
                <GameOverButton
                  onClick={resetGame}
                  disabled={isResetting}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isResetting ? "重置中..." : "再次游玩"}
                </GameOverButton>
                <GameOverButton
                  onClick={() => setShowGameOver(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  关闭
                </GameOverButton>
              </ButtonContainer>
            </GameOverModal>
          </>
        )}
      </AnimatePresence>
    </ChatContainer>
  );
};