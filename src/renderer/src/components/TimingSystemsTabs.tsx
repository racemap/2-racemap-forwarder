import { Badge, Flex, Tabs, type TabsProps } from 'antd';
import styled from 'styled-components';
import { RacemapColors } from '../../../consts';
import type { ServerState } from '../../../types';
import { ChronoTrackForwarderDetails } from './ChronoTrackForwarderDetails';
import { MyLapsForwarderDetails } from './MyLapsForwarderDetails';

type TimingSystemTabsProps = {
  appState: ServerState;
  logLines: Array<string>;
};

const TabLabel = ({ title, count }: { title: string; count?: number }) => (
  <Flex gap={8} align="center">
    {title}
    {count != null && count > 0 && <Badge count={count} overflowCount={99999} color={RacemapColors.PaleBlue} />}
  </Flex>
);

export const TimingSystemTabs = ({ appState, logLines }: TimingSystemTabsProps) => {
  const items: TabsProps['items'] = [
    {
      key: '1',
      label: <TabLabel title="MyLaps" count={appState.myLapsForwarder.forwardedReads} />,
      children: <MyLapsForwarderDetails forwarderState={appState.myLapsForwarder} />,
    },
    {
      key: '2',
      label: <TabLabel title="ChronoTrack" count={appState.chronoTrackForwarder.forwardedReads} />,
      children: <ChronoTrackForwarderDetails forwarderState={appState.chronoTrackForwarder} />,
    },
    {
      key: '3',
      label: <TabLabel title="RaceTec" />,
      children: (
        <>
          Please contact us if you use a RaceTec system and would like us to support it.
          <p>
            EMail:<a href="mailto:info@racemap.com">info@racemap.com</a>
          </p>
        </>
      ),
    },
    {
      key: '4',
      label: <TabLabel title="Log" />,
      children: (
        <LogContainer>
          <pre id="log" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {logLines.join('\n')}
          </pre>
        </LogContainer>
      ),
    },
  ];

  return <Tabs type="card" size="large" defaultActiveKey="1" items={items} style={{ marginTop: 16 }} />;
};

const LogContainer = styled.div`
  background-color: #000;
  color: #fff;
  padding: 10px;
  height: 300px;
  overflow-y: auto;
`;
