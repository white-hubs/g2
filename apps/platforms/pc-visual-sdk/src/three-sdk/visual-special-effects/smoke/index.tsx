import { defineComponent } from "vue";

import "./index.less";
export const SmokeEffect = defineComponent({
  setup: () => {
    return () => (
      <div class={"g-candle"}>
        <div class={"g-body"}>
          <div class={"g-smoke-box"}>
            <div class={"g-smoke"}>
              {[...Array(200)].map((item) => (
                <div
                  key={item}
                  style={{
                    width: `${Math.random() * 50}px`,
                    height: `${Math.random() * 50}px`,
                    left: `${Math.random() * 70 - 55}px`,
                    animation: `movesmoketop 1s linear ${(Math.random() * 3000) / 1000}s  infinite`,
                  }}
                  class={"g-smoke-ball"}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  },
});
