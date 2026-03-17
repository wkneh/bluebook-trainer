import { Mark, mergeAttributes } from '@tiptap/core'

const SmallCaps = Mark.create({
  name: 'smallCaps',

  parseHTML() {
    return [
      { tag: 'span.small-caps' },
      { tag: 'sc' },
      {
        style: 'font-variant',
        getAttrs: value => value === 'small-caps' ? {} : false,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'small-caps' }), 0]
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-s': () => this.editor.chain().focus().toggleMark('smallCaps').run(),
    }
  },
})

export default SmallCaps
