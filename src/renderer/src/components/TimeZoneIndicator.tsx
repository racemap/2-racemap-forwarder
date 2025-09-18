import { api } from '@renderer/api';
import { Button } from 'antd';
import { useEffect, useState } from 'react';
import { ServerState } from 'src/types';

type Props = {
  appState: ServerState;
};

// it should show the localtime and the utc time in a row and update every second
export const TimeZoneIndicator = ({ appState }: Props) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const localTime = currentTime.toLocaleString();
  // i want to have a time having the same offset as the user's timezone
  const toUTCHoursOffset = -currentTime.getTimezoneOffset() / 60;
  const userUtcTime = new Date(currentTime.getTime() - (appState.timeZoneOffsetInHours - toUTCHoursOffset) * 3600000);
  const userTimeZoneOffsetDiff = toUTCHoursOffset != appState.timeZoneOffsetInHours;

  return (
    <div
      style={{
        marginTop: '-12px',
        display: 'flex',
        flexDirection: 'row',
        gap: '20px',
        alignItems: 'flex-end',
        marginBottom: '10px',
      }}
    >
      <TimeCardWithHeading heading="Your Local Time" time={localTime} isoTime={currentTime.toISOString()} />
      <TimeCardWithHeading heading="Your UTC Time" time={currentTime.toUTCString()} isoTime={currentTime.toISOString()} />
      <UserDefinedOffsetSelector
        timeZoneOffsetInHours={appState.timeZoneOffsetInHours}
        userTimeZoneOffsetDiff={userTimeZoneOffsetDiff}
        toUTCHoursOffset={toUTCHoursOffset}
      />
      {userTimeZoneOffsetDiff && (
        <TimeCardWithHeading heading="With User Defined Offset UTC Time" time={userUtcTime.toUTCString()} isoTime={userUtcTime.toISOString()} />
      )}
    </div>
  );
};

const TimeCardWithHeading = ({ heading, time, isoTime }: { heading: string; time: string; isoTime: string }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '12px',
        padding: '10px',
      }}
    >
      <div>{heading}</div>
      <div style={{ fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }} title={`The UTC Time that your computer thinks is ${isoTime}`}>
        {time}
      </div>
    </div>
  );
};

const UserDefinedOffsetSelector = ({
  timeZoneOffsetInHours,
  userTimeZoneOffsetDiff,
  toUTCHoursOffset,
}: {
  timeZoneOffsetInHours: number;
  userTimeZoneOffsetDiff: boolean;
  toUTCHoursOffset: number;
}) => {
  const onUserTimezoneOffsetChange = async (newUserOffset: number) => {
    api.setUserTimezoneOffset(newUserOffset);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          fontSize: '12px',
        }}
      >
        Adjust Timezone Offset
      </div>
      <div
        style={{
          display: 'flex',
          gap: '10px',
          fontSize: '12px',
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginTop: '6px',
        }}
      >
        <Button
          title="Decrease user defined timezone offset by 1hour. Be careful, this can lead to wrong times if set wrong!"
          variant="solid"
          size="small"
          color="blue"
          // color={RacemapColors.PaleBlue}
          onClick={() => onUserTimezoneOffsetChange(timeZoneOffsetInHours - 1)}
        >
          -1h
        </Button>
        <Button
          disabled
          size="small"
          title={
            toUTCHoursOffset === 0
              ? 'Your timezone is UTC'
              : timeZoneOffsetInHours < 0
                ? `Your timezone is west of UTC ${userTimeZoneOffsetDiff && ' and user defined. Be careful!'}`
                : `Your timezone is east of UTC ${userTimeZoneOffsetDiff && ' and user defined. Be careful!'}`
          }
          style={{ color: userTimeZoneOffsetDiff ? '#a11010' : 'inherit' }}
        >
          {timeZoneOffsetInHours} h
        </Button>
        <Button
          variant="solid"
          size="small"
          color="blue"
          // color={RacemapColors.PaleBlue}
          title="Increase user defined timezone offset by 1hour. Be careful, this can lead to wrong times if set wrong!"
          onClick={() => onUserTimezoneOffsetChange(timeZoneOffsetInHours + 1)}
        >
          +1h
        </Button>{' '}
      </div>
    </div>
  );
};
