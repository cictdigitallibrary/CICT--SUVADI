import React from 'react';

const CategoryBanner = ({ src, alt }) => {
  return (
    <header className="category-banner">
      <img src={src} alt={alt || 'Category Banner'} />
    </header>
  );
};

export default CategoryBanner;
