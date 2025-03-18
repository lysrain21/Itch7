import styled from 'styled-components';
import { motion } from 'framer-motion';

export const MemoryButton = styled(motion.button)`
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: ${({ theme }) => theme.borders.glass};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text};
  backdrop-filter: ${({ theme }) => theme.blur.light};
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    box-shadow: ${({ theme }) => theme.shadows.glow};
    
    &::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        45deg,
        transparent 20%,
        rgba(255, 255, 255, 0.1) 50%,
        transparent 80%
      );
      animation: shine 1.5s;
    }
  }

  @keyframes shine {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;