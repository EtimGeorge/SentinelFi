import React from 'react';

// Mock for next/link component
// It simply renders its children, allowing interaction with the wrapped content.
const Link = ({ children, href, ...props }) => {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
};

export default Link;