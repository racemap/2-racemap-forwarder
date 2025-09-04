import styled from 'styled-components';
import { Table, Tag } from 'antd';
import type { ChronoTrackForwarderState } from 'src/main/chronoTrack/types';

type ChronoTrackForwarderDetailsProps = {
  forwarderState: ChronoTrackForwarderState;
};

export const ChronoTrackForwarderDetails = ({ forwarderState }: ChronoTrackForwarderDetailsProps) => {
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
    {
      title: 'Status',
      dataIndex: 'open',
      key: 'open',
      render: (open: boolean, row) => (
        <Tag title={row.open ? `Opened at ${row.openedAt}` : `Closed at ${row.closedAt}`} color={open ? 'green' : 'red'}>
          {open ? 'Open' : 'Closed'}
        </Tag>
      ),
    },
  ];

  const data = forwarderState.connections.map((connection, index) => ({
    index,
    key: connection.id,
    id: connection.id,
    open: connection.closedAt == null,
    sourceIP: connection.sourceIP,
    sourcePort: connection.sourcePort,
    forwardedReads: connection.forwardedReads,
    locations: connection.locations.join(', '),
  }));

  return (
    <DetailsContainer>
      <span>
        The table list all connection from any software connected to Port <strong>{forwarderState.listenPort}</strong>. To forward reads from
        ChronoTrack connect the exporter and forward all reads.
      </span>
      <Table dataSource={data} columns={columns} />
    </DetailsContainer>
  );
};

const DetailsContainer = styled.div`
  height: 100%;
`;
