import { QMark } from './q-mark';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto max-w-[1320px] px-5 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <QMark size={34} />
            <span className="font-display text-xl tracking-crunch">predi <span className='text-volt font-semibold'>Q</span>t</span>
            <span className="label ml-2">v0.1 · sepolia</span>
          </div>
          <div className="flex items-center gap-4 label">
            <a href="https://www.zama.ai/" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              Powered by Zama FHE
            </a>
            <span className="text-ink-ghost">·</span>
            <span>Predict privately</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
