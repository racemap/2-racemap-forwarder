import { Tabs, type TabsProps } from 'antd';
import type { ServerState } from '../../../types';
import { MyLapsForwarderDetails } from './MyLapsForwarderDetails';
import styled from 'styled-components';

type TimingSystemTabsProps = {
  appState: ServerState;
  logLines: Array<string>;
};

export const TimingSystemTabs = ({ appState, logLines }: TimingSystemTabsProps) => {
  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'From MyLaps',
      children: <MyLapsForwarderDetails forwarderState={appState.myLapsForwarder} />,
    },
    {
      key: '2',
      label: 'From ChronoTrack',
      children: 'Content of Tab Pane 2',
    },
    {
      key: '3',
      label: 'From RaceTec',
      children: 'Content of Tab Pane 3',
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
