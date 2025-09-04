import React from 'react';
import styled from 'styled-components';
import RacemapIcon from './RacemapIcon';
import ExternalLink from './ExternalLink';
import { api } from '@renderer/api';
import { JsonView } from 'react-json-view-lite';
import type { ServerState } from '../../../types';
import { EmptyServerState } from '../../../consts';
import { TimingSystemTabs } from './TimingSystemsTabs';
import { Col, Flex, Input, Row, Select, Switch } from 'antd';
import { EyeTwoTone, InfoCircleTwoTone, CheckCircleTwoTone, DoubleRightOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

import 'react-json-view-lite/dist/index.css';
import { TimeZoneIndicator } from './TimeZoneIndicator';

const RacemapBaseSection = (): React.ReactNode => {
  const [appState, setAppState] = React.useState<ServerState>(EmptyServerState);
  const [stdout, setStdout] = React.useState<Array<string>>([]);

  const onTokenChange = async (newToken: string) => {
    const newAppState = {
      ...appState,
      apiToken: newToken,
      apiTokenIsValid: await api.upgradeAPIToken(newToken),
    };
    setAppState(newAppState);
  };

  const onExpertChange = async () => {
    api.setExpertMode(!appState.expertMode);
  };

  const onChange = (eventId?: string) => {
    api.selectRacemapEvent(eventId);
  };

  const onSearch = (value: string) => {
    console.log('search:', value);
  };

  React.useEffect(() => {
    // Fetch the initial state
    const fetchState = async () => {
      const serverState = await api.getServerState();
      setAppState(serverState);
    };
    fetchState();

    const stateChangeHandler = (serverState: ServerState) => {
      setAppState(serverState);
    };

    const newStdOutLineHandler = (newLine: string) => {
      setStdout((prev) => [newLine, ...prev].slice(0, 500));
    };

    // Listen to server state changes
    window.api.onServerStateChange(stateChangeHandler);
    window.api.onNewStdOutLine(newStdOutLineHandler);

    return () => {
      window.api.removeServerStateChangeListener(stateChangeHandler);
      window.api.removeOnNewStdOutLineListener(newStdOutLineHandler);
    };
  }, []);

  return (
    <>
      <Flex gap={'8px'} justify="start" align="baseline">
        <ExternalLink href="https://docs.racemap.com/predictive-tracking-with-data-from-timekeeping">
          <RacemapIcon title="docs.racemap.com/predictive-tracking-with-data-from-timekeeping" style={{ marginRight: '20px' }} />
        </ExternalLink>

        <h1>2 RACEMAP Forwarder</h1>
        <span>{appState.version?.gitTag.split('_')[0]}</span>
        <Switch size="small" title="Toggle expert mode" checked={appState.expertMode} onChange={onExpertChange} />
      </Flex>
      <TimeZoneIndicator appState={appState} />
      <HorizontalLine />
      <Row>
        <Col span={appState.expertMode ? 13 : 24}>
          <h2>
            RACEMAP API Token{' '}
            <Tiny>
              <ExternalLink
                href={appState?.user ? `https://racemap.com/admin/account/${appState?.user.id}#api-tokens` : 'https://racemap.com/admin/account'}
              >
                get your token here
              </ExternalLink>
            </Tiny>
          </h2>
          <Flex gap="middle" align="start">
            <Input.Password
              size="large"
              value={appState?.apiToken ?? ''}
              placeholder="Paste your API Token here."
              prefix={<DoubleRightOutlined />}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              onChange={(e) => onTokenChange(e.target.value)}
            />
            {appState?.apiTokenIsValid ? (
              <CheckCircleTwoTone title="Your API Token is valid." twoToneColor="#52c41a" style={{ fontSize: '30px', marginTop: '4px' }} />
            ) : (
              <InfoCircleTwoTone
                title="Your API Token is invalid. Plese check on racemap.com."
                twoToneColor="#eb2f96"
                style={{ fontSize: '30px', marginTop: '4px' }}
              />
            )}
          </Flex>
          <TinyExplaination>
            The token gives you access to your RACEMAP Account. It's <strong>required</strong>.
          </TinyExplaination>
          <h2>
            Select RACEMAP Event <Tiny>optional</Tiny>
          </h2>
          <Flex gap="middle" align="start">
            <Select
              style={{ width: '100%' }}
              size="large"
              showSearch
              placeholder={
                appState?.events?.length > 0 ? `Select one of your ${appState?.events?.length} predictive events.` : 'No predictive events found.'
              }
              optionFilterProp="label"
              onChange={onChange}
              onSearch={onSearch}
              disabled={!appState?.apiTokenIsValid}
              allowClear
              options={appState?.events?.map((event) => ({
                label: event.name,
                value: event.id,
              }))}
            />
            {appState?.selectedEvent !== null ? (
              <CheckCircleTwoTone title="Your API Token is valid." twoToneColor="#52c41a" style={{ fontSize: '30px', marginTop: '4px' }} />
            ) : (
              <InfoCircleTwoTone
                title="Your API Token is invalid. Plese check on racemap.com."
                twoToneColor="#b2b2b2"
                style={{ fontSize: '30px', marginTop: '4px' }}
              />
            )}
          </Flex>
          <TinyExplaination>
            To select an event is <strong>optional</strong>. When using gun-times they will be assigned to the participants listed in the event.
            Otherwise the gun-times will be dropped.
          </TinyExplaination>
        </Col>
        {appState.expertMode && (
          <Col span={10} offset={1}>
            <h2>State</h2>
            <StateDetailsContainer>
              <JsonView
                shouldExpandNode={(level, _value) => {
                  if (level === 0) {
                    return true;
                  }
                  return false;
                }}
                style={{ backgroundColor: 'transparent' } as React.CSSProperties}
                data={appState}
              />
            </StateDetailsContainer>
          </Col>
        )}
      </Row>
      <TimingSystemTabs appState={appState} logLines={stdout} />
    </>
  );
};

export default RacemapBaseSection;

const StateDetailsContainer = styled.div`
  height: 210px;
  overflow-y: scroll;
`;

const TinyExplaination = styled.p`
  margin-left: 10px;
  font-size: 12px;
  color: #888;
`;

const HorizontalLine = styled.div`
  width: 100%;
  height: 1px;
  background-color: #ccc;
`;

const Tiny = styled.span`
  font-size: 12px;
  color: #888;
`;
