import styled from 'styled-components';

export const FrostedBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background: ${({ theme }) => theme.colors.background};
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.3) 100%
    );
    backdrop-filter: ${({ theme }) => theme.blur.light};
  }
`;

export const GlowEffect = styled.div`
  position: fixed;
  width: 300px;
  height: 300px;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(152, 245, 225, 0.3) 0%,
    transparent 60%
  );
  filter: blur(30px);
  pointer-events: none;
`;