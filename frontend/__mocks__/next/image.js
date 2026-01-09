import React from 'react';

const Image = ({ src, alt, width, height }) => {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={width} height={height} />;
};

export default Image;