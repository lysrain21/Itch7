import { useState } from 'react';
import { NeonText } from './components/NeonText';
import { MemoryButton } from './components/MemoryButton';
import { ChatWindow } from './components/ChatWindow';
import { motion } from 'framer-motion';
import { ThemeProvider } from 'styled-components';
import { GlobalStyle } from './styles/globalStyles';
import { glassTheme } from './styles/theme';
import { FrostedBackground, GlowEffect } from './components/FrostedBackground';
import styled from 'styled-components';
import { memoryService } from './api/memoryService';

// 添加玩法说明组件
const GameInstructions = styled(motion.div)`
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: ${({ theme }) => theme.borders.glass};
  border-radius: 15px;
  padding: 15px 20px;
  color: ${({ theme }) => theme.colors.text};
  max-width: 300px;
  box-shadow: ${({ theme }) => theme.shadows.soft};
  z-index: 50;
`;

const InstructionsTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.primary};
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.3);
`;

const InstructionsList = styled.ol`
  padding-left: 20px;
  
  li {
    margin-bottom: 8px;
    line-height: 1.4;
  }
`;

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 100vh;
`;
const HeaderText = styled.h1`
  font-size: 2.5rem;
  color: ${({ theme }) => theme.colors.text};
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin: 2rem 0;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  backdrop-filter: blur(5px);
`;

const ControlPanel = styled.div`
  display: flex;
  gap: 2rem;
  margin: 2rem 0;
`;

const StatusMessage = styled.div<{ isError?: boolean }>`
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: ${({ isError }) =>
    isError ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 0, 0.2)'};
  color: ${({ isError, theme }) =>
    isError ? '#ff6b6b' : theme.colors.text};
  transition: opacity 0.3s;
  opacity: 1;
  max-width: 400px;
  text-align: center;
`;

export default function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, isError: boolean } | null>(null);

  // 处理记忆体导出
  const handleExportMemory = async () => {
    try {
      setIsDownloading(true);
      setStatusMessage(null);

      const filename = await memoryService.exportMemory();

      setStatusMessage({
        text: `记忆库已成功导出为: ${filename}`,
        isError: false
      });
    } catch (error) {
      console.error("导出记忆体失败:", error);
      setStatusMessage({
        text: `导出失败: ${error instanceof Error ? error.message : '未知错误'}`,
        isError: true
      });
    } finally {
      setIsDownloading(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // 处理记忆体导入
  const handleImportMemory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    try {
      setIsUploading(true);
      setStatusMessage(null);

      await memoryService.importMemory(file);

      setStatusMessage({
        text: `记忆体 ${file.name} 已成功导入`,
        isError: false
      });
    } catch (error) {
      console.error("导入记忆体失败:", error);
      setStatusMessage({
        text: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`,
        isError: true
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  return (
    <ThemeProvider theme={glassTheme}>
      <GlobalStyle />
      <FrostedBackground />
      <GlowEffect style={{ top: '20%', left: '30%' }} />
      <GlowEffect style={{ top: '60%', right: '25%' }} />

      {/* 添加玩法说明 */}
      <GameInstructions
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <InstructionsTitle>玩法说明</InstructionsTitle>
        <InstructionsList>
          <li>在聊天框与AI聊天</li>
          <li>时间到达七年自动结束游戏</li>
          <li>随时保存你的记忆和导入你的记忆（结束后无法保存此次记忆）</li>
          <li>游戏结束后需要手动刷新界面才能够进行下一局</li>
        </InstructionsList>
      </GameInstructions>

      <AppContainer>
        <HeaderText>ITCH-7 v0.0</HeaderText>

        <ControlPanel>
          <MemoryButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportMemory}
            disabled={isDownloading}
          >
            {isDownloading ? '下载中...' : `下载记忆库`}
          </MemoryButton>
          <MemoryButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById('memory-upload')?.click()}
            disabled={isUploading}
          >
            {isUploading ? '上传中...' : `载入记忆库`}
          </MemoryButton>
          <input
            id="memory-upload"
            type="file"
            hidden
            accept=".snapshot"
            onChange={handleImportMemory}
          />
        </ControlPanel>

        {statusMessage && (
          <StatusMessage isError={statusMessage.isError}>
            {statusMessage.text}
          </StatusMessage>
        )}

        <ChatWindow />
      </AppContainer>
    </ThemeProvider>
  );
}