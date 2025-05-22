import { Tabs, type TabsProps } from 'antd';
import type { ServerState } from '../../../types';
import { MyLapsForwarderDetails } from './MyLapsForwarderDetails';
import styled from 'styled-components';
import { ChronoTrackForwarderDetails } from './ChronoTrackForwarderDetails';

type TimingSystemTabsProps = {
  appState: ServerState;
  logLines: Array<string>;
};

export const TimingSystemTabs = ({ appState, logLines }: TimingSystemTabsProps) => {
  const items: TabsProps['items'] = [
    {
      key: '1',
      label: `From MyLaps ${appState.myLapsForwarder.forwardedReads > 0 ? `(${appState.myLapsForwarder.forwardedReads})` : ''}`,
      children: <MyLapsForwarderDetails forwarderState={appState.myLapsForwarder} />,
    },
    {
      key: '2',
      label: `From ChronoTrack ${appState.chronoTrackForwarder.forwardedReads > 0 ? `(${appState.chronoTrackForwarder.forwardedReads})` : ''}`,
      children: <ChronoTrackForwarderDetails forwarderState={appState.chronoTrackForwarder} />,
    },
    {
      key: '3',
      label: 'From RaceTec',
      children: (
        <>
          Please contact us if you are using a RaceTec System and want to pend some effort to develop this feature.
          <p>
            EMail:<a href="mailto:info@racemap.com">info@racemap.com</a>
          </p>
        </>
      ),
    },
    {
      key: '4',
      label: 'Log-File',
      children: (
        <LogContainer>
          <pre id="log" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {logLines.join('\n')}
          </pre>
        </LogContainer>
      ),
    },
  ];

  return <Tabs defaultActiveKey="1" items={items} />;
};

const LogContainer = styled.div`
  background-color: #000;
  color: #fff;
  padding: 10px;
  height: 300px;
  overflow-y: auto;
`;
