import { ConfigProvider } from 'antd';
import type { API } from 'src/preload';
import styled from 'styled-components';
import { themeConfig } from '../theme';
import RacemapBaseSection from './RacemapBaseSection';

// define api for window object
declare global {
  interface Window {
    api: API;
  }
}

const App = () => {
  return (
    <ConfigProvider theme={themeConfig}>
      <Container>
        <RacemapBaseSection />
      </Container>
    </ConfigProvider>
  );
};

const Container = styled.div`
  margin: 20px;
`;

export default App;
