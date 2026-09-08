export function useThermalPrinter() {
  function printTicket() {
    window.print()
  }

  return { printTicket }
}