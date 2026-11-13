import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'

export type DiffTextMode = 'split' | 'unified'

const diffTextThemeVariables = {
  addedBackground: 'rgba(34, 197, 94, 0.08)',
  addedColor: 'var(--color-text)',
  changedBackground: 'rgba(234, 179, 8, 0.1)',
  codeFoldBackground: 'rgba(110, 116, 147, 0.08)',
  codeFoldContentColor: 'var(--color-mid-gray)',
  codeFoldGutterBackground: 'transparent',
  diffViewerBackground: 'transparent',
  diffViewerColor: 'var(--color-text)',
  emptyLineBackground: 'transparent',
  removedBackground: 'rgba(239, 68, 68, 0.08)',
  removedColor: 'var(--color-text)',
  wordAddedBackground: 'rgba(34, 197, 94, 0.35)',
  wordRemovedBackground: 'rgba(239, 68, 68, 0.35)',
}

const diffTextStyles = {
  diffContainer: { minWidth: '100%' },
  marker: { paddingLeft: '4px', paddingRight: '4px' },
  variables: {
    dark: diffTextThemeVariables,
    light: diffTextThemeVariables,
  },
}

export function DiffText({
  mode,
  newText,
  oldText,
}: {
  mode: DiffTextMode
  newText: string
  oldText: string
}): React.JSX.Element {
  return (
    <ReactDiffViewer
      compareMethod={DiffMethod.CHARS}
      disableWorker
      hideLineNumbers
      hideSummary
      newValue={newText}
      oldValue={oldText}
      splitView={mode === 'split'}
      styles={diffTextStyles}
    />
  )
}
