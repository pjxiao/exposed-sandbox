import React, { ReactNode } from "react";

const DICT_URL_PREFIX = 'https://dictionary.cambridge.org/dictionary/english';

interface Props extends React.HTMLProps<HTMLAnchorElement> {
    children?: string;
};


function strip(str: string) {
    return str
        .replace(/^\s|\s$/, '')
        .replace(/'s?$/, '')
        .replace(/[.,]$/, '')
    ;
}


function* join(nodes: Iterable<ReactNode>, sep: ReactNode) {
    const iter: Iterator<ReactNode> = nodes[Symbol.iterator]();
    let cur = iter.next();
    while (!cur.done) {
        yield cur.value;
        yield sep;
        cur = iter.next();
    }
}

export function NativeText(props: Props) {
    const anchors = (props.children || '')
        .split(' ')
        .map((w, idx) => (
            <a
                {...props}
                href={`${DICT_URL_PREFIX}/${strip(w)}`}
                target="_blank"
                rel="noopener noreferrer"
                key={idx}
            >{w}</a>
        ))
    ;
    return (
        <>
        {Array.from(join(anchors, ' '))}
        </>
    );
};
