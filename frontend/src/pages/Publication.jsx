import React from 'react';
import { useParams, Link } from 'react-router-dom';
import publicationsData from '../data/publications.json';
// The description: justified, whole words, no space added between letters (components/JustifiedText)
import JustifiedText from '../components/JustifiedText';

const Publication = () => {
  const { id } = useParams();
  const pub = publicationsData.find(p => p.id === parseInt(id));

  if (!pub) {
    return (
      <div className="bg-[#FAF8F2] py-32 flex flex-col items-center justify-center">
        <h1 className="text-3xl text-maroon font-bold mb-4">Publication Not Found</h1>
        <Link to="/" className="text-gold underline">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF8F2]">
      <div className="py-12 sm:py-16 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="mb-10 text-xs font-bold uppercase tracking-widest text-stone-400">
          <Link to="/" className="hover:text-maroon transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-maroon">Publication</span>
        </div>

        {/* Cover in the middle of the page, the details below it */}
        <div className="flex flex-col items-center">
          <div className="relative group rounded-xl overflow-hidden shadow-2xl w-full max-w-[260px] sm:max-w-[300px] bg-white p-2">
            <img
              src={pub.coverUrl}
              alt={pub.title}
              className="w-full h-auto object-cover rounded-lg group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/20 opacity-50 pointer-events-none" />
          </div>

          <div className="w-full mt-10 sm:mt-12">
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-maroon leading-snug mb-4 tamil-heading drop-shadow-sm">
                {pub.title.replace(/\s+/g, ' ')}
              </h1>
              {pub.author && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <div className="w-8 h-px bg-gold/70 shrink-0" />
                  <p className="text-sm md:text-base font-bold text-stone-600 tracking-wide">
                    {pub.author}
                  </p>
                  <div className="w-8 h-px bg-gold/70 shrink-0" />
                </div>
              )}
            </div>

            <div className="text-stone-700">
              {pub.about.map((p, index) => (
                <JustifiedText key={index} text={p} className="publication-about tamil-text opacity-90 mb-6 last:mb-0" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Publication;
