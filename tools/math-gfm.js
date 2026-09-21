// GitHub 风格的数学语法扩展 —— 基于 micromark-extension-math@3.1.0（MIT）
// 移植，并打上 cmark-gfm 的三条 delimiter 规则补丁，对齐 GitHub 的渲染行为：
//   1. 开启 $ 后紧跟数字不开公式（`$100` 不再误开数学式）
//   2. 关闭 $ 后紧跟数字不闭合（`...$100` 不能截断公式）
//   3. 数学式内 `\$` 按转义消费为字面美元符（`$\sqrt{\$4}$` 可渲染）
// $$ 块级语法（mathFlow）原样移植。仅类型层依赖 micromark-util-types。

import { factorySpace } from "micromark-factory-space";
import { markdownLineEnding } from "micromark-util-character";

const DOLLAR = 36;
const BACKSLASH = 92;
const DIGIT = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57];

function isDigit(code) {
  return code !== null && code !== undefined && DIGIT.includes(code);
}

// ---- 行内 $...$（打补丁）----

function previous(code) {
  // If there is a previous code, there will always be a tail.
  const tail = this.events[this.events.length - 1];
  return code !== DOLLAR || tail[1].type === "characterEscape";
}

const resolveMathText = (events) => {
  // 解析器要把自建构造（mathTextData 等）就地改名 —— 通过下标视图操作事件流
  const at = (i) => events[i][1];
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  let index;
  let enter;

  if (
    (at(headEnterIndex).type === "lineEnding" || at(headEnterIndex).type === "space") &&
    (at(tailExitIndex).type === "lineEnding" || at(tailExitIndex).type === "space")
  ) {
    index = headEnterIndex;
    while (++index < tailExitIndex) {
      if (at(index).type === "mathTextData") {
        at(tailExitIndex).type = "mathTextPadding";
        at(headEnterIndex).type = "mathTextPadding";
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break;
      }
    }
  }

  index = headEnterIndex - 1;
  tailExitIndex++;
  while (++index <= tailExitIndex) {
    if (enter === undefined) {
      if (index !== tailExitIndex && at(index).type !== "lineEnding") {
        enter = index;
      }
    } else if (index === tailExitIndex || at(index).type === "lineEnding") {
      at(enter).type = "mathTextData";
      if (index !== enter + 2) {
        at(enter).end = at(index - 1).end;
        events.splice(enter + 2, index - enter - 2);
        tailExitIndex -= index - enter - 2;
        index = enter + 2;
      }
      enter = undefined;
    }
  }
  return events;
};

const mathTextConstruct = {
  tokenize: tokenizeMathText,
  resolve: resolveMathText,
  previous,
  name: "mathText",
};

function tokenizeMathText(effects, ok, nok) {
  let sizeOpen = 0;
  let size = 0;
  let token;
  return start;

  function start(code) {
    console.error("[mathText] start, code:", code);
    effects.enter("mathText");
    effects.enter("mathTextSequence");
    return sequenceOpen(code);
  }

  function sequenceOpen(code) {
    if (code === DOLLAR) {
      effects.consume(code);
      sizeOpen++;
      return sequenceOpen;
    }
    // 双美元（$$..$$）不受「数字不开」规则限制
    if (sizeOpen < 2 && isDigit(code)) {
      return nok(code);
    }
    effects.exit("mathTextSequence");
    return between(code);
  }

  function between(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === DOLLAR) {
      token = effects.enter("mathTextSequence");
      size = 0;
      return sequenceClose(code);
    }
    if (code === BACKSLASH) {
      effects.enter("mathTextData");
      effects.consume(code);
      return escapedData;
    }
    if (code === 32) {
      effects.enter("space");
      effects.consume(code);
      effects.exit("space");
      return between;
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return between;
    }
    effects.enter("mathTextData");
    return data(code);
  }

  function data(code) {
    if (code === null || code === 32 || code === DOLLAR || markdownLineEnding(code)) {
      effects.exit("mathTextData");
      return between(code);
    }
    if (code === BACKSLASH) {
      effects.consume(code);
      return escapedData;
    }
    effects.consume(code);
    return data;
  }

  /** 数学式内 \$：反斜杠后的任意字符按数据消费，不作为关闭序列 */
  function escapedData(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("mathTextData");
      return between(code);
    }
    effects.consume(code);
    effects.exit("mathTextData");
    return between;
  }

  function sequenceClose(code) {
    if (code === DOLLAR) {
      effects.consume(code);
      size++;
      return sequenceClose;
    }
    if (size === sizeOpen) {
      console.error("[mathText] close candidate, size:", size, "next:", code);
      if (isDigit(code)) {
        token.type = "mathTextData";
        return data(code);
      }
      effects.exit("mathTextSequence");
      effects.exit("mathText");
      return ok(code);
    }
    console.error("[mathText] close rejected (size mismatch)");
    token.type = "mathTextData";
    return data(code);
  }
}



// ---- 块级 $$...$$（原样移植）----

const mathFlowConstruct = {
  tokenize: tokenizeMathFenced,
  concrete: true,
  name: "mathFlow",
};

const nonLazyContinuation = {
  tokenize: tokenizeNonLazyContinuation,
  partial: true,
};

function tokenizeMathFenced(effects, ok, nok) {
  const self = this;
  const tail = self.events[self.events.length - 1];
  const initialSize = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
  let sizeOpen = 0;
  return start;

  function start(code) {
    effects.enter("mathFlow");
    effects.enter("mathFlowFence");
    effects.enter("mathFlowFenceSequence");
    return sequenceOpen(code);
  }

  function sequenceOpen(code) {
    if (code === DOLLAR) {
      effects.consume(code);
      sizeOpen++;
      return sequenceOpen;
    }
    if (sizeOpen < 2) {
      return nok(code);
    }
    effects.exit("mathFlowFenceSequence");
    return factorySpace(effects, metaBefore, "whitespace")(code);
  }

  function metaBefore(code) {
    if (code === null || markdownLineEnding(code)) {
      return metaAfter(code);
    }
    effects.enter("mathFlowFenceMeta");
    effects.enter("chunkString", { contentType: "string" });
    return meta(code);
  }

  function meta(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("chunkString");
      effects.exit("mathFlowFenceMeta");
      return metaAfter(code);
    }
    if (code === DOLLAR) {
      return nok(code);
    }
    effects.consume(code);
    return meta;
  }

  function metaAfter(code) {
    effects.exit("mathFlowFence");
    if (self.interrupt) {
      return ok(code);
    }
    return effects.attempt(nonLazyContinuation, beforeNonLazyContinuation, after)(code);
  }

  function beforeNonLazyContinuation(code) {
    return effects.attempt({ tokenize: tokenizeClosingFence, partial: true }, after, contentStart)(code);
  }

  function contentStart(code) {
    return (initialSize ? factorySpace(effects, beforeContentChunk, "linePrefix", initialSize + 1) : beforeContentChunk)(code);
  }

  function beforeContentChunk(code) {
    if (code === null) {
      return after(code);
    }
    if (markdownLineEnding(code)) {
      return effects.attempt(nonLazyContinuation, beforeNonLazyContinuation, after)(code);
    }
    effects.enter("mathFlowValue");
    return contentChunk(code);
  }

  function contentChunk(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("mathFlowValue");
      return beforeContentChunk(code);
    }
    effects.consume(code);
    return contentChunk;
  }

  function after(code) {
    effects.exit("mathFlow");
    return ok(code);
  }

  function tokenizeClosingFence(effects, ok, nok) {
    let size = 0;
    return factorySpace(
      effects,
      beforeSequenceClose,
      "linePrefix",
      self.parser.constructs.disable.null.includes("codeIndented") ? undefined : 4,
    );

    function beforeSequenceClose(code) {
      effects.enter("mathFlowFence");
      effects.enter("mathFlowFenceSequence");
      return sequenceClose(code);
    }

    function sequenceClose(code) {
      if (code === DOLLAR) {
        size++;
        effects.consume(code);
        return sequenceClose;
      }
      if (size < sizeOpen) {
        return nok(code);
      }
      effects.exit("mathFlowFenceSequence");
      return factorySpace(effects, afterSequenceClose, "whitespace")(code);
    }

    function afterSequenceClose(code) {
      if (code === null || markdownLineEnding(code)) {
        effects.exit("mathFlowFence");
        return ok(code);
      }
      return nok(code);
    }
  }
}

function tokenizeNonLazyContinuation(effects, ok, nok) {
  const self = this;
  return start;

  function start(code) {
    if (code === null) {
      return ok(code);
    }
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return lineStart;
  }

  function lineStart(code) {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code);
  }
}

/** 创建 GitHub 风格数学语法的 micromark 扩展 */
export function mathGfm() {
  return {
    flow: { [DOLLAR]: mathFlowConstruct },
    text: { [DOLLAR]: mathTextConstruct },
  };
}

