import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import type React from "react";
import { useState, useRef, useEffect } from "react";

export const Route = createFileRoute("/")({
  loader: () => getData(),
  component: Home,
});

const getData = createServerFn().handler(({ context }) => {
  return {
    message: `Running in ${navigator.userAgent}`,
    myVar: env.MY_VAR,
  };
});

interface Product {
  id: number;
  name: string;
  colorName: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  badges: Array<"sale" | "sold-out">;
}

const products: Product[] = [
  {
    id: 1,
    name: "Creme Lipstick",
    colorName: "Light Pink Blush",
    price: 167000,
    rating: 5,
    reviewCount: 12,
    image: "#ffc4c4",
    badges: ["sold-out"],
  },
  {
    id: 2,
    name: "Creme Lipstick",
    colorName: "Lavender Dream",
    price: 167000,
    rating: 4.5,
    reviewCount: 8,
    image: "#c4a4d4",
    badges: ["sold-out"],
  },
  {
    id: 3,
    name: "Creme Lipstick",
    colorName: "Medium Pink Mauve",
    price: 132000,
    originalPrice: 167000,
    rating: 5,
    reviewCount: 15,
    image: "#d4a4c4",
    badges: [],
  },
  {
    id: 4,
    name: "Creme Lipstick",
    colorName: "Peachy Nude",
    price: 167000,
    rating: 5,
    reviewCount: 23,
    image: "#f4d4c4",
    badges: ["sold-out"],
  },
  {
    id: 5,
    name: "Creme Lipstick",
    colorName: "Soft Rose Mauve",
    price: 167000,
    rating: 4.5,
    reviewCount: 19,
    image: "#d4b4c4",
    badges: ["sold-out"],
  },
  {
    id: 6,
    name: "Creme Lipstick",
    colorName: "True Cherry Red",
    price: 132000,
    originalPrice: 167000,
    rating: 5,
    reviewCount: 31,
    image: "#e43e3e",
    badges: ["sold-out", "sale"],
  },
  {
    id: 7,
    name: "Lipstick",
    colorName: "Coral Bliss",
    price: 90,
    originalPrice: 120,
    rating: 4.8,
    reviewCount: 45,
    image: "#ff6b6b",
    badges: ["sale"],
  },
  {
    id: 8,
    name: "Lipstick",
    colorName: "Ruby Red",
    price: 95,
    rating: 4.9,
    reviewCount: 67,
    image: "#c41e3a",
    badges: [],
  },
  {
    id: 9,
    name: "Lipstick",
    colorName: "Velvet Burgundy",
    price: 110,
    rating: 5,
    reviewCount: 89,
    image: "#800020",
    badges: [],
  },
];

function ProductCard({
  product,
  scale = 1,
  opacity = 1,
}: {
  product: Product;
  scale?: number;
  opacity?: number;
}) {
  const formatPrice = (price: number) => {
    return `₭${price.toLocaleString()}.00`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg
          key={`full-${i}`}
          className="w-3.5 h-3.5 fill-current text-gray-800"
          viewBox="0 0 20 20"
        >
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg
          key="half"
          className="w-3.5 h-3.5 text-gray-800"
          viewBox="0 0 20 20"
        >
          <defs>
            <linearGradient id={`half-${product.id}`}>
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#half-${product.id})`}
            d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"
          />
        </svg>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg
          key={`empty-${i}`}
          className="w-3.5 h-3.5 fill-current text-gray-300"
          viewBox="0 0 20 20"
        >
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      );
    }

    return stars;
  };

  return (
    <div
      className="flex-shrink-0 w-64 group cursor-pointer transition-all duration-500 ease-out"
      style={{
        transform: `scale(${scale})`,
        opacity: opacity,
      }}
    >
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        {/* Product Image */}
        <div className="relative bg-gray-50 h-80 flex items-center justify-center">
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {product.badges.includes("sold-out") && (
              <span className="px-2.5 py-1 bg-white text-gray-800 text-xs font-medium rounded border border-gray-300">
                Sold out
              </span>
            )}
            {product.badges.includes("sale") && (
              <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded">
                Sale
              </span>
            )}
          </div>

          {/* Lipstick Illustration */}
          <div className="relative">
            <svg
              width="100"
              height="280"
              viewBox="0 0 100 280"
              className="drop-shadow-lg"
            >
              {/* Lipstick case bottom */}
              <rect
                x="25"
                y="180"
                width="50"
                height="100"
                fill="#e5e5e5"
                rx="2"
              />
              <rect
                x="27"
                y="182"
                width="46"
                height="96"
                fill="#f5f5f5"
                rx="1"
              />

              {/* Lipstick case middle band */}
              <rect x="23" y="170" width="54" height="12" fill="#d4d4d4" />
              <rect x="25" y="171" width="50" height="10" fill="#e8e8e8" />

              {/* Lipstick case top */}
              <rect
                x="28"
                y="80"
                width="44"
                height="92"
                fill="#e5e5e5"
                rx="2"
              />
              <rect
                x="30"
                y="82"
                width="40"
                height="88"
                fill="#f8f8f8"
                rx="1"
              />

              {/* Lipstick bullet */}
              <ellipse cx="50" cy="45" rx="18" ry="8" fill={product.image} />
              <rect x="32" y="45" width="36" height="40" fill={product.image} />
              <path
                d="M 32 75 Q 50 90 68 75 L 68 45 L 32 45 Z"
                fill={product.image}
              />

              {/* Shine effect */}
              <ellipse
                cx="45"
                cy="50"
                rx="4"
                ry="15"
                fill="white"
                opacity="0.3"
              />
            </svg>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            {renderStars(product.rating)}
            <span className="text-xs text-gray-500 ml-1">
              ({product.reviewCount})
            </span>
          </div>

          {/* Product Name */}
          <h3 className="font-semibold text-gray-900 text-sm mb-1">
            {product.name}
          </h3>

          {/* Color Name */}
          <p className="text-sm text-gray-600 mb-3">{product.colorName}</p>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span
              className={`font-bold ${product.originalPrice ? "text-red-600" : "text-gray-900"}`}
            >
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const data = Route.useLoaderData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerView = 5; // use an odd number so there's a single center card
  const centerOffset = Math.floor(itemsPerView / 2);
  // Card geometry for stacking
  const cardWidth = 256; // matches w-64
  const overlapPx = 72; // how much each subsequent card overlaps the previous one
  const step = cardWidth - overlapPx; // translate step between cards when stacked
  const getMaxIndex = (len: number) => Math.max(len - 1 - centerOffset, 0);
  const maxIndex = getMaxIndex(products.length);

  // Keep the true center card centered in the viewport
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [baseOffset, setBaseOffset] = useState(0);

  useEffect(() => {
    const updateBase = () => {
      const w = containerRef.current?.clientWidth ?? 0;
      // Center the (currentIndex + centerOffset) card when currentIndex === 0
      const offset = w / 2 - cardWidth / 2 - centerOffset * step;
      setBaseOffset(offset);
    };
    updateBase();
    window.addEventListener("resize", updateBase);
    return () => window.removeEventListener("resize", updateBase);
  }, [centerOffset, step]);
  // Drag state
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const currentTranslateRef = useRef(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? maxIndex : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? 0 : prev - 1));
  };

  // Drag helpers
  const pointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;

    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    try {
      el.setPointerCapture?.(e.pointerId);
    } catch {}
    el.style.cursor = "grabbing";
    // ensure no transition while dragging
    el.style.transition = "";
    // prevent text selection while dragging (bad UX)
    try {
      // apply to body to cover all elements
      (document.body.style as any).userSelect = "none";
      (document.body.style as any).webkitUserSelect = "none";
    } catch {}
  };

  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const dx = e.clientX - startXRef.current;
    currentTranslateRef.current = dx;
    // apply a transform directly for smooth follow
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(calc(${baseOffset - currentIndex * step}px + ${dx}px))`;
    }
  };

  const pointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const dx = currentTranslateRef.current;

    // threshold to change slide (snap)
    const threshold = 80;
    let newIndex = currentIndex;
    if (dx < -threshold) {
      newIndex = Math.min(currentIndex + 1, maxIndex);
    } else if (dx > threshold) {
      newIndex = Math.max(currentIndex - 1, 0);
    }

    setCurrentIndex(newIndex);

    // reset styles and snap using the computed newIndex
    if (trackRef.current) {
      // release pointer capture if any
      try {
        trackRef.current.releasePointerCapture?.(e.pointerId);
      } catch {}

      trackRef.current.style.transition =
        "transform 400ms cubic-bezier(.2,.8,.2,1)";
      trackRef.current.style.transform = `translateX(${baseOffset - newIndex * step}px)`;
      // cleanup transition after it finishes
      const t = () => {
        if (trackRef.current) trackRef.current.style.transition = "";
        trackRef.current?.removeEventListener("transitionend", t);
        if (trackRef.current) trackRef.current.style.cursor = "grab";
      };
      trackRef.current.addEventListener("transitionend", t);
    }

    currentTranslateRef.current = 0;
    // restore text selection
    try {
      (document.body.style as any).userSelect = "";
      (document.body.style as any).webkitUserSelect = "";
    } catch {}
  };

  // Calculate scale and opacity based on position relative to the single center card
  const getCardStyle = (index: number) => {
    const centerPosition = currentIndex + centerOffset;
    const distance = Math.abs(index - centerPosition);

    // Scale from 1.0 (center) to 0.7 (edges)
    const scale = Math.max(0.7, 1 - distance * 0.15);

    // Opacity from 1.0 (center) to 0.6 (edges)
    const opacity = Math.max(0.6, 1 - distance * 0.2);

    return { scale, opacity };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5e6d3] to-[#e8d4c0]">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.3em] text-gray-600 font-medium mb-3">
            YOUR FAVORITES
          </p>
          <h1 className="text-5xl font-light text-gray-800 tracking-tight">
            Loved By You
          </h1>
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Previous Button */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 -ml-6 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Previous products"
          >
            <svg
              className="w-6 h-6 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Carousel Container */}
          <div
            ref={containerRef}
            className="overflow-hidden px-2"
            style={{ perspective: "1000px" }}
          >
            <div
              ref={trackRef}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
              className="flex transition-transform duration-500 ease-out cursor-grab"
              style={{
                transform: `translateX(${baseOffset - currentIndex * step}px)`,
                transformStyle: "preserve-3d",
              }}
            >
              {products.map((product, index) => {
                const { scale, opacity } = getCardStyle(index);
                // compute zIndex based on distance to the center card so center is on top
                const centerPosition = currentIndex + centerOffset;
                const distanceToCenter = Math.abs(index - centerPosition);
                const zIndex = 1000 - distanceToCenter;

                return (
                  <div
                    key={product.id}
                    style={{
                      marginLeft: index === 0 ? 0 : -overlapPx,
                      position: "relative",
                      zIndex: zIndex,
                    }}
                  >
                    <ProductCard
                      product={product}
                      scale={scale}
                      opacity={opacity}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 -mr-6 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Next products"
          >
            <svg
              className="w-6 h-6 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* View All Button */}
        <div className="flex justify-center mt-12">
          <button className="px-8 py-3 bg-gray-800 text-white font-medium rounded-full hover:bg-gray-900 transition-colors duration-300 shadow-md hover:shadow-lg">
            View all
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div className="max-w-7xl mx-auto px-6 py-8 text-sm text-gray-600">
        <p>Environment: {data.message}</p>
        <p>Config: {data.myVar}</p>
      </div>
    </div>
  );
}
