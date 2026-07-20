import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Text, MeshDistortMaterial, PerspectiveCamera, Stars, Environment } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import * as THREE from 'three';

const PalmLeafPage = ({ position, rotation, delay }) => {
  const mesh = useRef();
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.position.y += Math.sin(time + delay) * 0.002;
      mesh.current.rotation.z += Math.cos(time + delay) * 0.001;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={mesh} position={position} rotation={rotation}>
        <boxGeometry args={[4, 0.05, 0.8]} />
        <meshStandardMaterial 
          color="#E8D5B0" 
          roughness={0.8} 
          metalness={0.1}
        />
        {/* Palm leaf hole detail */}
        <mesh position={[-1.5, 0.03, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
          <meshStandardMaterial color="#3D3530" />
        </mesh>
        <mesh position={[1.5, 0.03, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
          <meshStandardMaterial color="#3D3530" />
        </mesh>
      </mesh>
    </Float>
  );
};

const Particles = ({ count = 40 }) => {
  const points = useMemo(() => {
    const p = new Array(count).fill(0).map(() => ({
      position: [Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 10 - 5],
      size: Math.random() * 0.05 + 0.02,
      opacity: Math.random() * 0.5 + 0.2
    }));
    return p;
  }, [count]);

  return points.map((p, i) => (
    <mesh key={i} position={p.position}>
      <sphereGeometry args={[p.size, 8, 8]} />
      <meshBasicMaterial color="#C9973B" transparent opacity={p.opacity} />
    </mesh>
  ));
};

const Hero_3D = () => {
  const { language, t } = useLanguage();

  return (
    <div className="canvas-container h-[90vh] md:h-screen w-full relative bg-ivory">
      <Suspense fallback={<div className="flex items-center justify-center h-full text-maroon font-cinzel tracking-widest animate-pulse">{t('பதிவிறக்கம் செய்கிறது...', 'Initializing Digital Manuscript Room...')}</div>}>
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          
          {/* Animated Palm Leaves */}
          <PalmLeafPage position={[0, 0, 0]} rotation={[0.4, 0.3, 0]} delay={0} />
          <PalmLeafPage position={[-5, 2, -5]} rotation={[0.2, -0.5, 0.2]} delay={2} />
          <PalmLeafPage position={[5, -3, -4]} rotation={[-0.3, 0.6, -0.1]} delay={4} />
          
          <Float speed={2} rotationIntensity={1} floatIntensity={1}>
             <Text
              fontSize={0.6}
              color="#C9973B"
              position={[0, 2, 0]}
              maxWidth={10}
              textAlign="center"
            >
              {t('சுவடி', 'S U V A D I')}
            </Text>
          </Float>

          <Particles count={60} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Environment preset="sunset" />
          
          <fog attach="fog" args={['#F5F0E8', 5, 20]} />
        </Canvas>
      </Suspense>
      
      {/* Overlay Content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="space-y-6"
          >
            {/* Institute Label */}
            <div className="inline-block">
              <p className="font-cinzel text-bronze text-[10px] md:text-xs uppercase tracking-[0.5em] mb-2">
                Central Institute of Classical Tamil
              </p>
              <div className="h-[1px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            </div>

            {/* Main Tamil Heading */}
            <h1 className="tamil-heading text-5xl md:text-7xl lg:text-8xl leading-none" style={{ fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Cinzel", serif', fontWeight: 800 }}>
              <span className="block text-maroon">சுவடி</span>
              <span className="block text-shimmer text-3xl md:text-4xl mt-2" style={{ fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 600 }}>
                {t('செவ்வியல் ஆவணக் கருவூலம்', 'Classical Heritage Archive')}
              </span>
            </h1>

            {/* Tamil Subtitle */}
            <p className="tamil-body text-[#4A1010] font-bold text-[1.1rem] md:text-[1.2rem] lg:text-[1.35rem] max-w-xl mx-auto leading-loose" style={{ fontFamily: language === 'ta' ? '"Noto Sans Tamil", sans-serif' : '"Inter", sans-serif' }}>
              {t(
                'ஓலைச்சுவடிகளிலிருந்து செம்பதிப்புகள் வரை — தமிழ் செவ்வியல் இலக்கியத்தின் மின்னணு ஆவணக் கருவூலம்.',
                'From palm-leaf manuscripts to critical editions — preserving Classical Tamil civilization.'
              )}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 pointer-events-auto pt-2">
              <button
                id="hero-explore-btn"
                className="btn-primary flex items-center gap-3 px-10 py-4"
                onClick={() => window.location.href = '/search'}
              >
                <span className="tamil-label text-sm">{t('சுவடித் தேடல்', 'Explore Archives')}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                id="hero-about-btn"
                className="btn-outline px-10 py-4"
                onClick={() => window.location.href = '/ebooks'}
              >
                <span className="tamil-label text-sm">{t('மின் நூலகம்', 'Digital Library')}</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="absolute bottom-10 left-0 w-full hidden md:block z-10">
        <div className="container mx-auto px-6 flex justify-between items-end border-b border-maroon/10 pb-8">
          <div className="flex gap-16">
            <div className="flex flex-col">
              <span className="text-3xl font-playfair font-bold text-maroon">41</span>
              <span className="text-[10px] uppercase tracking-widest text-bronze font-bold">Classical Works</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-playfair font-bold text-maroon">12k+</span>
              <span className="text-[10px] uppercase tracking-widest text-bronze font-bold">Manucripts</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-playfair font-bold text-maroon">100%</span>
              <span className="text-[10px] uppercase tracking-widest text-bronze font-bold">Digital Open-Access</span>
            </div>
          </div>
          <div className="text-xs italic text-stone/40">
            Dedicated to the preservation of Classical Tamil civilization.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero_3D;
