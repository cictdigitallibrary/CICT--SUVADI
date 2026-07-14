import React from 'react';
import { useParams, Link } from 'react-router-dom';
import publicationsData from '../data/publications.json';

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
      <div className="py-16 px-6 md:px-12 max-w-6xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="mb-10 text-xs font-bold uppercase tracking-widest text-stone-400">
          <Link to="/" className="hover:text-maroon transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-maroon">Publication</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
          
          {/* Left Column: Cover Image */}
          <div className="flex flex-col items-center md:items-start">
            <div className="relative group rounded-xl overflow-hidden shadow-2xl w-full max-w-sm md:max-w-md bg-white p-2">
              <img 
                src={pub.coverUrl} 
                alt={pub.title} 
                className="w-full h-auto object-cover rounded-lg group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/20 opacity-50 pointer-events-none" />
            </div>
          </div>

          {/* Right Column: Book Details */}
          <div className="flex flex-col">
            <div className="mb-8">
              <h1 className="text-3xl md:text-5xl font-black text-maroon leading-tight mb-4 tamil-heading drop-shadow-sm">
                {pub.title}
              </h1>
              {pub.author && (
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-8 h-px bg-gold/70" />
                  <p className="text-sm md:text-base font-bold text-stone-600 uppercase tracking-widest font-cinzel">
                    {pub.author}
                  </p>
                </div>
              )}
            </div>

            <div className="prose prose-stone prose-lg max-w-none text-stone-700 leading-loose">
              {pub.about.map((p, index) => (
                <p key={index} className="mb-6 text-justify tamil-text opacity-90">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Publication;
