import React, { useEffect } from 'react'
import { toArabicDigits } from '@/lib/formatters'

interface ArabicDigitsProviderProps {
  children: React.ReactNode
}

const EXCLUDED_TAGS = new Set([
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'SCRIPT',
  'STYLE',
  'CODE',
  'PRE',
  'SVG',
  'CANVAS',
])

function isExcludedElement(el: Node | null): boolean {
  let current: Node | null = el
  while (current && current !== document.body && current !== document.documentElement) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement
      if (EXCLUDED_TAGS.has(element.tagName)) {
        return true
      }
      if (
        element.hasAttribute?.('data-no-arabic') ||
        element.hasAttribute?.('data-no-arabic-digits') ||
        element.classList?.contains('barcode') ||
        element.classList?.contains('barcode-print-container') ||
        element.classList?.contains('no-arabic')
      ) {
        return true
      }
    }
    current = current.parentNode
  }
  return false
}

function processTextNode(node: Text) {
  const text = node.nodeValue
  if (!text || !/[0-9]/.test(text)) return
  if (isExcludedElement(node.parentNode)) return

  const converted = toArabicDigits(text)
  if (converted !== text) {
    node.nodeValue = converted
  }
}

function walkAndConvert(root: Node) {
  if (isExcludedElement(root)) return

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.nodeValue || !/[0-9]/.test(node.nodeValue)) {
        return NodeFilter.FILTER_REJECT
      }
      if (isExcludedElement(node.parentNode)) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  let currentNode = walker.nextNode()
  while (currentNode) {
    processTextNode(currentNode as Text)
    currentNode = walker.nextNode()
  }
}

export const ArabicDigitsProvider: React.FC<ArabicDigitsProviderProps> = ({ children }) => {
  useEffect(() => {
    // Initial pass on mount
    walkAndConvert(document.body)

    let isUpdating = false
    const observer = new MutationObserver((mutations) => {
      if (isUpdating) return
      isUpdating = true

      try {
        for (const mutation of mutations) {
          if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
            processTextNode(mutation.target as Text)
          } else if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                processTextNode(node as Text)
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                walkAndConvert(node)
              }
            })
          }
        }
      } finally {
        isUpdating = false
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  return <>{children}</>
}
