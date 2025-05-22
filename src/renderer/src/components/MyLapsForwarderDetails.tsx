import { Table } from 'antd';
import type { MyLapsForwarderState } from '../../../types';
import styled from 'styled-components';

type MyLapsForwarderDetailsProps = {
  forwarderState: MyLapsForwarderState;
};

export const MyLapsForwarderDetails = ({ forwarderState }: MyLapsForwarderDetailsProps) => {
  const columns = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      render: (index: number) => index + 1,
    },
    {
      title: 'Locations',
      dataIndex: 'locations',
      key: 'locations',
    },
    {
      title: 'Forwarded Reads',
      dataIndex: 'forwardedReads',
      key: 'forwardedReads',
    },
    {
      title: 'Source IP',
      dataIndex: 'sourceIP',
      key: 'sourceIP',
    },
    {
      title: 'Source Port',
      dataIndex: 'sourcePort',
      key: 'sourcePort',
    },
  ];

  const data = forwarderState.connections.map((connection, index) => ({
    index,
    key: connection.id,
    id: connection.id,
    sourceIP: connection.sourceIP,
    sourcePort: connection.sourcePort,
    forwardedReads: connection.forwardedReads,
    locations: connection.locations
      .map((l) => {
        return l.name;
      })
      .join(', '),
  }));

  return (
    <DetailsContainer>
      <span>
        {`The table list all connection from any software connected to Port ${forwarderState.listenPort}.
				To forward reads from MyLaps connect the exporter and forward all
				reads.`}
      </span>
      <Table dataSource={data} columns={columns} />
    </DetailsContainer>
  );
};

const DetailsContainer = styled.div`
  height: 100%;
`;
