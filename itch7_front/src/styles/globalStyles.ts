import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    font-family: 'Poppins', sans-serif;
    min-height: 100vh;
  }

  ::-webkit-scrollbar {
    width: 8px;
    background: rgba(255, 255, 255, 0.2);
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(255, 182, 193, 0.5);
    border-radius: 4px;
  }
`;