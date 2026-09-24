import type { API } from 'src/preload';
import styled from 'styled-components';
import RacemapBaseSection from './RacemapBaseSection';

// define api for window object
declare global {
  interface Window {
    api: API;
  }
}

const App = () => {
  return (
    <Container>
      <RacemapBaseSection />
    </Container>
  );
};

const Container = styled.div`
  margin: 20px;
`;

export default App;
