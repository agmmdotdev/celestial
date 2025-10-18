import { type JSX } from "react";
import React from "react";

type StackedCardsProps = {
  children: React.ReactNode;
  /** Overlap amount in pixels (how much each card overlaps the previous one) */
  overlap?: number;
  /** Direction of stacking; horizontal overlaps to the left by default */
  direction?: "horizontal" | "vertical";
  className?: string;
};

export function StackedCards({
  children,
  overlap = 64,
  direction = "horizontal",
  className,
}: StackedCardsProps): JSX.Element {
  const childArray = React.Children.toArray(children);
  const isHorizontal = direction === "horizontal";

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: isHorizontal ? "row" : "column",
    alignItems: "flex-start",
    overflow: "visible",
  };

  return (
    <div className={className} style={containerStyle}>
      {childArray.map((child, childIndex) => {
        const wrapperStyle: React.CSSProperties = {
          position: "relative",
          zIndex: 1000 - childIndex,
          transition: "transform 180ms ease, box-shadow 180ms ease",
          // apply negative margin to create overlap
          marginLeft: isHorizontal
            ? childIndex === 0
              ? 0
              : -overlap
            : undefined,
          marginTop: !isHorizontal
            ? childIndex === 0
              ? 0
              : -overlap
            : undefined,
        };

        return (
          <div key={childIndex} style={wrapperStyle}>
            {child}
          </div>
        );
      })}
    </div>
  );
}
