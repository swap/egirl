async function run(args: string[]) {
  return args.join(" ");
}

const help = "Print arguments back to the terminal";
const group = "shell";

export { run, help, group };
