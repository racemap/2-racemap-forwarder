import { Flex, FloatButton, Input, Modal, message } from 'antd';
import { CSSProperties, FC, Suspense, useState } from 'react';
import { UAParser } from 'ua-parser-js';
import classNames from 'classnames';
import { IconCommentDots, IconExclamationTriangle } from '../components/Icon';
import { api } from '@renderer/api';
import { RacemapUser, UserFeedbackPrototype } from 'src/types';
import styled from 'styled-components';
import { RacemapColors } from '../../../consts';
import { isNotEmptyString } from '../../../functions';
import { ErrorBoundary } from './ErrorBoundary';

const { TextArea } = Input;

export const UserFeedback = ({ user }: { user: RacemapUser | null }) => {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // const currentUser = useCurrentUser();
  const userAgent = new UAParser().getResult();

  // Don't show feedback button if the user is not logged in
  if (user === null) return null;

  const handleSend = async () => {
    if (!content.trim()) {
      message.warning('Please enter some feedback.');
      return;
    }

    setLoading(true);
    try {
      const feedback: UserFeedbackPrototype = {
        content,
        source: '2-racemap-forwarder',
        systemInfo: {
          browser: `${userAgent.browser.name} ${userAgent.browser.version}`,
          os: `${userAgent.os.name} ${userAgent.os.version}`,
          engine: `${userAgent.engine.name} ${userAgent.engine.version}`,
          device: userAgent.device.type || 'desktop', // can be 'mobile', 'tablet', etc.
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date(),
        },
      };

      await api.createUserFeedback(feedback);
      message.success('Feedback sent. Thank you!');
      setContent('');
      setVisible(false);
    } catch (err) {
      console.error(err);
      message.error('Failed to send feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatButton
        type="primary"
        icon={<IconCommentDots />}
        onClick={() => setVisible(true)}
        style={{ right: 20, top: 20, padding: 3, height: 46, width: 46 }}
        tooltip="Send feedback"
      />
      <Modal
        title={
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              <Flex gap={4}>
                Hey <UserLabel user={user} />. How can we help?
              </Flex>
            </div>
            <div style={{ fontSize: '13px', color: '#888' }}>Tell us where you struggled or got blocked — no detail is too small.</div>
          </div>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={handleSend}
        okText="Send"
        confirmLoading={loading}
      >
        <TextArea rows={8} value={content} onChange={(e) => setContent(e.target.value)} autoFocus />
      </Modal>
    </>
  );
};

interface UserLabelTextProps {
  user: RacemapUser | null;
  suffix?: string;
  prefix?: string;
}

export const UserLabelText: FC<UserLabelTextProps> = ({ user, suffix, prefix }) => {
  const text = user?.name || user?.email || user?.id || 'Unknown User';

  return (
    <HStack title={text} gap="3px">
      {isNotEmptyString(prefix) && <AdditionalText>{prefix}</AdditionalText>}
      {text}
      {isNotEmptyString(suffix) && <AdditionalText>{suffix}</AdditionalText>}
    </HStack>
  );
};

const HStack = styled(Flex)<{
  justify?: CSSProperties['justifyContent'];
  align?: CSSProperties['alignItems'];
  width?: CSSProperties['width'];
  gap?: CSSProperties['gap'];
  wrap?: CSSProperties['flexWrap'];
}>`
  justify-content: ${({ justify = 'space-between' }) => justify};
  align-items: ${({ align = 'center' }) => align};
  width: ${({ width = 'auto' }) => width};
  column-gap: ${({ gap = 'normal' }) => gap};
  flex-wrap: ${({ wrap = 'nowrap' }) => wrap};
  flex-direction: row;
`;

const AdditionalText = styled.div`
  color: ${RacemapColors.DarkGray};
`;

interface UserLabelProps {
  user: RacemapUser | null;
  suffix?: string;
  prefix?: string;
}

export const UserLabel: FC<UserLabelProps> = (props) => {
  const { user } = props;
  if (user == null) return null;

  return (
    <ErrorBoundary fallback={({ errorMessage }) => <ErrorFallback userId={user?.id.toString()} errorMessage={errorMessage} />}>
      <Suspense fallback={<Placeholder animation={Animations.GLOW} width="200px" />}>
        <UserLabelText {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

const ErrorFallback = ({ errorMessage, userId }: { errorMessage?: string; userId: string }) => {
  const title = getErrorMessageTitle(errorMessage);

  return (
    <>
      <IconExclamationTriangle color={RacemapColors.DarkGray} title={title} style={{ marginRight: 5, marginLeft: 5 }} />
      {userId}
    </>
  );
};

const getErrorMessageTitle = (errorMessage?: string) => {
  if (errorMessage?.includes('Status: 404')) {
    return 'User not found';
  }

  return 'User could not be loaded';
};

export enum Animations {
  NONE = 'none',
  GLOW = 'glow',
  WAVE = 'wave',
}

interface PlaceholderProps {
  animation?: Animations;
  width?: CSSProperties['width'];
  inline?: boolean;
}

export const Placeholder: FC<PlaceholderProps> = ({ animation = Animations.NONE, width = '100%', inline = false }) => (
  <PlaceholderContainer
    className={classNames({
      'placeholder-glow': animation === Animations.GLOW,
      'placeholder-wave': animation === Animations.WAVE,
    })}
    style={{ width, display: inline ? 'inline-block' : 'block' }}
  >
    <div className="placeholder" style={{ padding: 5, width: '100%' }} />
  </PlaceholderContainer>
);

const PlaceholderContainer = styled.div`
  .placeholder {
    display: inline-block;
    min-height: 1em;
    border-radius: 9999px;
    vertical-align: middle;
    cursor: wait;
    background-color: currentcolor;
    opacity: 0.5;

    &.btn::before {
      display: inline-block;
      content: '';
    }
  }

  // Animation
  &.placeholder-glow {
    .placeholder {
      animation: placeholder-glow 2s ease-in-out infinite;
    }
  }

  @keyframes placeholder-glow {
    50% {
      opacity: 0.2;
    }
  }

  &.placeholder-wave {
    mask-image: linear-gradient(130deg, #000 55%, rgba(0, 0, 0, (1 - 0.2)) 75%, #000 95%);
    mask-size: 200% 100%;
    animation: placeholder-wave 2s linear infinite;
  }

  @keyframes placeholder-wave {
    100% {
      mask-position: -200% 0%;
    }
  }
`;
