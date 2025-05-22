import { api } from '@renderer/api';

const ExternalLink = ({ href, children, ...props }) => {
  const handleClick = (e) => {
    e.preventDefault();
    api.callExternalLink(href);
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
};

export default ExternalLink;
