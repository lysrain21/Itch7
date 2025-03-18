import styled from 'styled-components';

export const NeonText = styled.div<{ color?: string }>`
  font-family: ${({ theme }) => theme.fonts.main};
  color: ${({ color, theme }) => color || theme.colors.primary};
  text-shadow: ${({ theme }) => theme.glows.primary};
  animation: flicker 1.5s infinite alternate;

  @keyframes flicker {
    0%, 18%, 22%, 25%, 53%, 57%, 100% {
      text-shadow: 
        0 0 5px ${({ color, theme }) => color || theme.colors.primary},
        0 0 10px ${({ color, theme }) => color || theme.colors.primary},
        0 0 20px ${({ color, theme }) => color || theme.colors.primary};
    }
    20%, 24%, 55% {
      text-shadow: none;
    }
  }
`;