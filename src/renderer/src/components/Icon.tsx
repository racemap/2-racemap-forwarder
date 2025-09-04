import * as fa from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon, type FontAwesomeIconProps } from '@fortawesome/react-fontawesome';
import { forwardRef } from 'react';

type Props = Omit<FontAwesomeIconProps, 'icon'>;

export const IconCommentDots = forwardRef<SVGSVGElement, Props>((props, ref) => (
  <FontAwesomeIcon icon={fa.faCommentDots} {...props} ref={ref} key="comment-dots" />
));

export const IconExclamationTriangle = forwardRef<SVGSVGElement, Props>((props, ref) => (
  <FontAwesomeIcon icon={fa.faExclamationTriangle} {...props} ref={ref} key="exclamation-triangle" />
));
