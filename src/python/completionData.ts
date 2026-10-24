export type PythonCompletionItem = {
  label: string;
  kind: 'keyword' | 'builtin' | 'module' | 'function' | 'snippet' | 'variable';
  detail?: string;
  documentation?: string;
  insertText: string;
  sortGroup: number;
};

export type PythonCompletionContext = {
  trigger: 'word' | 'dot' | 'from' | 'import';
  prefix: string;
  moduleName: string | null;
  documentText: string;
  workspaceFiles: string[];
};

export type PythonCompletionSource = {
  id: string;
  itemsFor(context: PythonCompletionContext): PythonCompletionItem[];
};

const KEYWORD_GROUP = 10;
const SNIPPET_GROUP = 20;
const BUILTIN_GROUP = 30;
const MODULE_GROUP = 40;
const MEMBER_GROUP = 50;

function keyword(label: string): PythonCompletionItem {
  return {
    label,
    kind: 'keyword',
    detail: 'Python keyword',
    insertText: label,
    sortGroup: KEYWORD_GROUP,
  };
}

function builtin(label: string, detail: string, documentation: string): PythonCompletionItem {
  return {
    label,
    kind: 'builtin',
    detail,
    documentation,
    insertText: `${label}()`,
    sortGroup: BUILTIN_GROUP,
  };
}

function moduleItem(label: string, summary: string): PythonCompletionItem {
  return {
    label,
    kind: 'module',
    detail: `standard library · ${summary}`,
    documentation: `Python standard library module: ${summary}.`,
    insertText: label,
    sortGroup: MODULE_GROUP,
  };
}

function member(label: string, signature: string, description: string): PythonCompletionItem {
  return {
    label,
    kind: 'function',
    detail: `${signature} · ${description}`,
    documentation: description,
    insertText: `${label}()`,
    sortGroup: MEMBER_GROUP,
  };
}

function constant(label: string, detail: string, documentation: string): PythonCompletionItem {
  return {
    label,
    kind: 'variable',
    detail,
    documentation,
    insertText: label,
    sortGroup: MEMBER_GROUP,
  };
}

function snippet(
  label: string,
  detail: string,
  insertText: string,
  documentation: string,
): PythonCompletionItem {
  return {
    label,
    kind: 'snippet',
    detail,
    documentation,
    insertText,
    sortGroup: SNIPPET_GROUP,
  };
}

export const PYTHON_KEYWORDS: PythonCompletionItem[] = [
  keyword('False'),
  keyword('None'),
  keyword('True'),
  keyword('and'),
  keyword('as'),
  keyword('assert'),
  keyword('async'),
  keyword('await'),
  keyword('break'),
  keyword('class'),
  keyword('continue'),
  keyword('def'),
  keyword('del'),
  keyword('elif'),
  keyword('else'),
  keyword('except'),
  keyword('finally'),
  keyword('for'),
  keyword('from'),
  keyword('global'),
  keyword('if'),
  keyword('import'),
  keyword('in'),
  keyword('is'),
  keyword('lambda'),
  keyword('nonlocal'),
  keyword('not'),
  keyword('or'),
  keyword('pass'),
  keyword('raise'),
  keyword('return'),
  keyword('try'),
  keyword('while'),
  keyword('with'),
  keyword('yield'),
];

export const PYTHON_BUILTINS: PythonCompletionItem[] = [
  builtin('abs', 'abs(x)', 'Return the absolute value of x.'),
  builtin('all', 'all(iterable)', 'Return True when every item of the iterable is truthy.'),
  builtin('any', 'any(iterable)', 'Return True when at least one item is truthy.'),
  builtin('ascii', 'ascii(object)', 'Return an ASCII-only representation of the object.'),
  builtin('bin', 'bin(x)', 'Return the binary representation of an integer as a string.'),
  builtin('bool', 'bool(x)', 'Return the boolean value of x.'),
  builtin('bytearray', "bytearray(source=b'')", 'Create a mutable sequence of bytes.'),
  builtin('bytes', "bytes(source=b'')", 'Create an immutable sequence of bytes.'),
  builtin('callable', 'callable(object)', 'Return True when the object can be called.'),
  builtin('chr', 'chr(i)', 'Return the character for a Unicode code point.'),
  builtin('classmethod', 'classmethod(function)', 'Wrap a function as a class method.'),
  builtin('compile', "compile(source, filename, mode)", 'Compile source into a code object.'),
  builtin('complex', 'complex(real=0, imag=0)', 'Create a complex number.'),
  builtin('delattr', 'delattr(object, name)', 'Delete the named attribute from an object.'),
  builtin('dict', 'dict(**kwargs)', 'Create a dictionary.'),
  builtin('dir', 'dir(object=None)', 'Return the names in the current or given scope.'),
  builtin('divmod', 'divmod(a, b)', 'Return the quotient and remainder as a tuple.'),
  builtin('enumerate', 'enumerate(iterable, start=0)', 'Yield index and item pairs from an iterable.'),
  builtin('eval', 'eval(source, globals=None, locals=None)', 'Evaluate a Python expression.'),
  builtin('exec', 'exec(source, globals=None, locals=None)', 'Execute Python statements.'),
  builtin('filter', 'filter(function, iterable)', 'Yield the items for which the function is true.'),
  builtin('float', 'float(x=0)', 'Convert x to a floating point number.'),
  builtin('format', "format(value, format_spec='')", 'Format a value with a format specification.'),
  builtin('frozenset', 'frozenset(iterable)', 'Create an immutable set.'),
  builtin('getattr', 'getattr(object, name, default)', 'Read an attribute from an object.'),
  builtin('globals', 'globals()', 'Return the global symbol table as a dictionary.'),
  builtin('hasattr', 'hasattr(object, name)', 'Return True when the object has the attribute.'),
  builtin('hash', 'hash(object)', 'Return the hash value of an object.'),
  builtin('help', 'help(object=None)', 'Show help for an object or start the help system.'),
  builtin('hex', 'hex(x)', 'Return the hexadecimal representation of an integer.'),
  builtin('id', 'id(object)', 'Return the identity of an object.'),
  builtin('input', "input(prompt='')", 'Read a line from standard input.'),
  builtin('int', 'int(x=0, base=10)', 'Convert x to an integer.'),
  builtin('isinstance', 'isinstance(object, classinfo)', 'Check whether an object is an instance of a type.'),
  builtin('issubclass', 'issubclass(class_, classinfo)', 'Check whether a class is a subclass of another.'),
  builtin('iter', 'iter(object, sentinel=None)', 'Return an iterator for an object.'),
  builtin('len', 'len(object)', 'Return the number of items in an object.'),
  builtin('list', 'list(iterable)', 'Create a list from an iterable.'),
  builtin('locals', 'locals()', 'Return the local symbol table as a dictionary.'),
  builtin('map', 'map(function, iterable)', 'Apply the function to every item of the iterable.'),
  builtin('max', 'max(iterable, key=None)', 'Return the largest item.'),
  builtin('min', 'min(iterable, key=None)', 'Return the smallest item.'),
  builtin('next', 'next(iterator, default=None)', 'Return the next item from an iterator.'),
  builtin('object', 'object()', 'Create a base object instance.'),
  builtin('oct', 'oct(x)', 'Return the octal representation of an integer.'),
  builtin('open', "open(file, mode='r', encoding=None)", 'Open a file and return a file object.'),
  builtin('ord', 'ord(c)', 'Return the Unicode code point of a character.'),
  builtin('pow', 'pow(base, exp, mod=None)', 'Raise base to the power of exp.'),
  builtin('print', "print(*values, sep=' ', end='\\n', file=None, flush=False)", 'Write values to the text stream.'),
  builtin('property', 'property(fget=None, fset=None)', 'Return a property attribute.'),
  builtin('range', 'range(start, stop=None, step=1)', 'Create an arithmetic progression of integers.'),
  builtin('repr', 'repr(object)', 'Return a printable representation of an object.'),
  builtin('reversed', 'reversed(sequence)', 'Return a reverse iterator over a sequence.'),
  builtin('round', 'round(number, ndigits=None)', 'Round a number to the given precision.'),
  builtin('set', 'set(iterable)', 'Create a set from an iterable.'),
  builtin('setattr', 'setattr(object, name, value)', 'Set the named attribute on an object.'),
  builtin('slice', 'slice(start, stop=None, step=None)', 'Create a slice object.'),
  builtin('sorted', 'sorted(iterable, key=None, reverse=False)', 'Return a new sorted list from an iterable.'),
  builtin('staticmethod', 'staticmethod(function)', 'Wrap a function as a static method.'),
  builtin("str", "str(object='')", 'Return a string representation of an object.'),
  builtin('sum', 'sum(iterable, start=0)', 'Sum the items of an iterable.'),
  builtin('super', 'super(type=None, object=None)', 'Return a proxy for the parent class.'),
  builtin('tuple', 'tuple(iterable)', 'Create a tuple from an iterable.'),
  builtin('type', 'type(object)', 'Return the type of an object.'),
  builtin('vars', 'vars(object=None)', 'Return the __dict__ of an object.'),
  builtin('zip', 'zip(*iterables)', 'Combine iterables into tuples.'),
];

export const PYTHON_STDLIB_MODULES: PythonCompletionItem[] = [
  moduleItem('os', 'operating system interfaces'),
  moduleItem('sys', 'interpreter state and command line'),
  moduleItem('math', 'math functions'),
  moduleItem('json', 'JSON encoding and decoding'),
  moduleItem('re', 'regular expressions'),
  moduleItem('random', 'random number generation'),
  moduleItem('pathlib', 'filesystem paths'),
  moduleItem('datetime', 'dates and times'),
  moduleItem('collections', 'container types'),
  moduleItem('itertools', 'iterator building blocks'),
  moduleItem('subprocess', 'subprocess management'),
  moduleItem('typing', 'type hints'),
  moduleItem('dataclasses', 'data classes'),
  moduleItem('csv', 'CSV reading and writing'),
  moduleItem('functools', 'higher order functions'),
  moduleItem('string', 'string constants and templates'),
  moduleItem('time', 'time access and conversion'),
  moduleItem('logging', 'logging facility'),
  moduleItem('argparse', 'command line argument parsing'),
  moduleItem('statistics', 'statistical functions'),
  moduleItem('shutil', 'high level file operations'),
  moduleItem('tempfile', 'temporary files and directories'),
  moduleItem('hashlib', 'secure hash algorithms'),
  moduleItem('uuid', 'UUID objects'),
];

export const PYTHON_STDLIB_MEMBERS: Record<string, PythonCompletionItem[]> = {
  os: [
    member('getcwd', 'getcwd()', 'Return the current working directory.'),
    member('listdir', "listdir(path='.')", 'List the entries of a directory.'),
    member('makedirs', 'makedirs(name, exist_ok=False)', 'Create a directory and its parents.'),
    member('remove', 'remove(path)', 'Delete a file.'),
    member('rename', 'rename(src, dst)', 'Rename a file or directory.'),
    member('walk', 'walk(top, topdown=True)', 'Walk a directory tree.'),
    constant('environ', 'environ', 'Mapping with the environment variables.'),
    constant('sep', 'sep', 'Path separator of the operating system.'),
    constant('linesep', 'linesep', 'Line separator of the operating system.'),
  ],
  sys: [
    member('exit', 'exit(code=0)', 'Exit the interpreter with a status code.'),
    constant('argv', 'argv', 'Command line arguments of the script.'),
    constant('path', 'path', 'Module search path.'),
    constant('version', 'version', 'Python version string.'),
    constant('version_info', 'version_info', 'Python version as a tuple.'),
    constant('stdin', 'stdin', 'Standard input stream.'),
    constant('stdout', 'stdout', 'Standard output stream.'),
    constant('stderr', 'stderr', 'Standard error stream.'),
    constant('platform', 'platform', 'Platform identifier.'),
  ],
  math: [
    member('sqrt', 'sqrt(x) → float', 'square root of x'),
    member('floor', 'floor(x) → int', 'largest integer ≤ x'),
    member('ceil', 'ceil(x) → int', 'smallest integer ≥ x'),
    member('fsum', 'fsum(iterable) → float', 'accurate float sum'),
    member('factorial', 'factorial(n) → int', 'factorial of n'),
    member('gcd', 'gcd(a, b) → int', 'greatest common divisor'),
    member('log', 'log(x, base=e) → float', 'natural or base logarithm'),
    member('log10', 'log10(x) → float', 'base 10 logarithm'),
    member('sin', 'sin(x) → float', 'sine of x in radians'),
    member('cos', 'cos(x) → float', 'cosine of x in radians'),
    member('tan', 'tan(x) → float', 'tangent of x in radians'),
    member('radians', 'radians(x) → float', 'convert degrees to radians'),
    member('degrees', 'degrees(x) → float', 'convert radians to degrees'),
    member('hypot', 'hypot(*coordinates) → float', 'Euclidean norm'),
    member('isclose', 'isclose(a, b, rel_tol=1e-09) → bool', 'compare floats approximately'),
    member('trunc', 'trunc(x) → int', 'truncate x toward zero'),
    constant('pi', 'pi = 3.141592653589793', 'ratio of a circle circumference to its diameter'),
    constant('e', 'e = 2.718281828459045', 'base of the natural logarithm'),
    constant('tau', 'tau = 6.283185307179586', 'two times pi'),
    constant('inf', 'inf', 'positive infinity'),
    constant('nan', 'nan', 'not a number'),
  ],
  json: [
    member('dumps', 'dumps(obj, indent=None) → str', 'serialize an object to a JSON string'),
    member('loads', 'loads(s) → object', 'parse a JSON string'),
    member('dump', 'dump(obj, file, indent=None)', 'write an object as JSON to a file'),
    member('load', 'load(file) → object', 'read a JSON document from a file'),
  ],
  re: [
    member('match', 'match(pattern, string) → Match | None', 'match at the start of the string'),
    member('search', 'search(pattern, string) → Match | None', 'find the first match anywhere'),
    member('findall', 'findall(pattern, string) → list', 'return all non-overlapping matches'),
    member('finditer', 'finditer(pattern, string)', 'iterate over all matches'),
    member('sub', 'sub(pattern, repl, string) → str', 'replace matches in a string'),
    member('split', 'split(pattern, string) → list', 'split a string by a pattern'),
    member('compile', 'compile(pattern, flags=0) → Pattern', 'compile a pattern for reuse'),
    member('escape', 'escape(text) → str', 'escape special characters'),
    constant('IGNORECASE', 'IGNORECASE', 'case insensitive matching flag'),
    constant('MULTILINE', 'MULTILINE', 'multi-line matching flag'),
  ],
  random: [
    member('random', 'random() → float', 'random float in the range [0, 1)'),
    member('randint', 'randint(a, b) → int', 'random integer between a and b'),
    member('randrange', 'randrange(start, stop=None, step=1) → int', 'random item from a range'),
    member('choice', 'choice(seq)', 'random item from a sequence'),
    member('choices', 'choices(population, k=1) → list', 'random items with replacement'),
    member('shuffle', 'shuffle(seq)', 'shuffle a sequence in place'),
    member('sample', 'sample(population, k) → list', 'random items without replacement'),
    member('seed', 'seed(value=None)', 'seed the random number generator'),
    member('uniform', 'uniform(a, b) → float', 'random float between a and b'),
  ],
  pathlib: [
    member('Path', 'Path(*pathsegments)', 'filesystem path for the running platform'),
    member('PurePath', 'PurePath(*pathsegments)', 'platform independent filesystem path'),
    member('PosixPath', 'PosixPath(*pathsegments)', 'POSIX filesystem path'),
    member('WindowsPath', 'WindowsPath(*pathsegments)', 'Windows filesystem path'),
  ],
  datetime: [
    member('datetime', 'datetime(year, month, day, hour=0, minute=0)', 'date and time object'),
    member('date', 'date(year, month, day)', 'calendar date object'),
    member('time', 'time(hour=0, minute=0, second=0)', 'time of day object'),
    member('timedelta', 'timedelta(days=0, seconds=0)', 'duration between two dates or times'),
    member('timezone', 'timezone(offset, name=None)', 'fixed offset from UTC'),
  ],
  collections: [
    member('Counter', 'Counter(iterable=None)', 'count occurrences of items'),
    member('defaultdict', 'defaultdict(default_factory)', 'dictionary with default values'),
    member('deque', 'deque(iterable=(), maxlen=None)', 'double ended queue'),
    member('OrderedDict', 'OrderedDict(items=())', 'dictionary that remembers insertion order'),
    member('namedtuple', 'namedtuple(typename, field_names)', 'tuple subclass with named fields'),
    member('ChainMap', 'ChainMap(*maps)', 'group multiple mappings into one view'),
  ],
  itertools: [
    member('count', 'count(start=0, step=1)', 'count upwards without a limit'),
    member('cycle', 'cycle(iterable)', 'repeat an iterable forever'),
    member('repeat', 'repeat(object, times=None)', 'repeat an object'),
    member('chain', 'chain(*iterables)', 'concatenate iterables'),
    member('combinations', 'combinations(iterable, r)', 'all r-length combinations'),
    member('permutations', 'permutations(iterable, r=None)', 'all r-length permutations'),
    member('product', 'product(*iterables, repeat=1)', 'cartesian product of iterables'),
    member('islice', 'islice(iterable, stop)', 'slice an iterator'),
    member('groupby', 'groupby(iterable, key=None)', 'group consecutive items by key'),
    member('accumulate', 'accumulate(iterable, func=None)', 'running totals of an iterable'),
    member('zip_longest', 'zip_longest(*iterables, fillvalue=None)', 'zip iterables of different lengths'),
  ],
  subprocess: [
    member('run', 'run(args, check=False, capture_output=False)', 'run a command and wait for it'),
    member('Popen', 'Popen(args, **kwargs)', 'start a child process'),
    member('call', 'call(args, **kwargs) → int', 'run a command and return its exit code'),
    member('check_call', 'check_call(args, **kwargs) → int', 'run a command and raise on failure'),
    member('check_output', 'check_output(args, **kwargs) → bytes', 'run a command and capture its output'),
    constant('PIPE', 'PIPE', 'pipe constant for standard streams'),
    constant('DEVNULL', 'DEVNULL', 'discard constant for standard streams'),
  ],
  typing: [
    member('List', 'List[item_type]', 'list type annotation'),
    member('Dict', 'Dict[key_type, value_type]', 'dictionary type annotation'),
    member('Tuple', 'Tuple[item_types, ...]', 'tuple type annotation'),
    member('Set', 'Set[item_type]', 'set type annotation'),
    member('Optional', 'Optional[type]', 'value that may be None'),
    member('Union', 'Union[type_a, type_b]', 'one of several types'),
    member('Any', 'Any', 'any type'),
    member('Callable', 'Callable[[arguments], result]', 'callable type annotation'),
    member('Iterable', 'Iterable[item_type]', 'iterable type annotation'),
    member('Sequence', 'Sequence[item_type]', 'sequence type annotation'),
    member('Mapping', 'Mapping[key_type, value_type]', 'mapping type annotation'),
    member('TypeVar', 'TypeVar(name)', 'declare a generic type variable'),
    member('Generic', 'Generic[type_var]', 'base class for generic types'),
    member('Protocol', 'Protocol', 'structural typing protocol'),
    member('cast', 'cast(type, value)', 'tell the type checker the type of a value'),
    member('Literal', 'Literal[values, ...]', 'type restricted to literal values'),
    member('Final', 'Final[type]', 'value that cannot be reassigned'),
    constant('TYPE_CHECKING', 'TYPE_CHECKING', 'True while a type checker is running'),
  ],
  dataclasses: [
    member('dataclass', 'dataclass(cls=None)', 'decorator that generates special methods'),
    member('field', 'field(default=MISSING)', 'customize a data class field'),
    member('asdict', 'asdict(instance) → dict', 'convert an instance to a dictionary'),
    member('astuple', 'astuple(instance) → tuple', 'convert an instance to a tuple'),
    member('replace', 'replace(instance, **changes)', 'create a modified copy of an instance'),
    member('make_dataclass', 'make_dataclass(cls_name, fields)', 'create a data class dynamically'),
    member('fields', 'fields(class_or_instance) → tuple', 'describe the fields of a data class'),
  ],
  csv: [
    member('reader', 'reader(csvfile, dialect=excel)', 'read rows from a CSV file'),
    member('writer', 'writer(csvfile, dialect=excel)', 'write rows to a CSV file'),
    member('DictReader', 'DictReader(csvfile, fieldnames=None)', 'read CSV rows as dictionaries'),
    member('DictWriter', 'DictWriter(csvfile, fieldnames)', 'write dictionaries as CSV rows'),
  ],
  functools: [
    member('reduce', 'reduce(function, iterable[, initial])', 'fold an iterable into a single value'),
    member('partial', 'partial(func, *args, **kwargs)', 'bind arguments to a function'),
    member('lru_cache', 'lru_cache(maxsize=128)', 'cache function results'),
    member('wraps', 'wraps(wrapped)', 'copy metadata onto a wrapper function'),
    member('cached_property', 'cached_property(func)', 'property computed once per instance'),
  ],
  string: [
    constant('ascii_letters', 'ascii_letters', 'lowercase and uppercase ASCII letters'),
    constant('ascii_lowercase', 'ascii_lowercase', 'lowercase ASCII letters'),
    constant('ascii_uppercase', 'ascii_uppercase', 'uppercase ASCII letters'),
    constant('digits', 'digits', 'decimal digit characters'),
    constant('punctuation', 'punctuation', 'ASCII punctuation characters'),
  ],
  time: [
    member('sleep', 'sleep(seconds)', 'pause the current thread'),
    member('time', 'time() → float', 'seconds since the epoch'),
    member('monotonic', 'monotonic() → float', 'monotonic clock value'),
    member('strftime', 'strftime(format, time_tuple=None) → str', 'format a time tuple'),
    member('localtime', 'localtime(seconds=None) → struct_time', 'convert seconds to local time'),
  ],
  logging: [
    member('getLogger', 'getLogger(name=None) → Logger', 'return a logger with the given name'),
    member('basicConfig', 'basicConfig(**kwargs)', 'configure the root logger'),
    member('debug', 'debug(message, *args)', 'log a debug message on the root logger'),
    member('info', 'info(message, *args)', 'log an info message on the root logger'),
    member('warning', 'warning(message, *args)', 'log a warning message on the root logger'),
    member('error', 'error(message, *args)', 'log an error message on the root logger'),
  ],
  argparse: [
    member('ArgumentParser', 'ArgumentParser(prog=None, description=None)', 'command line argument parser'),
  ],
  statistics: [
    member('mean', 'mean(data) → float', 'arithmetic mean of the data'),
    member('median', 'median(data)', 'middle value of the data'),
    member('stdev', 'stdev(data) → float', 'sample standard deviation'),
    member('variance', 'variance(data) → float', 'sample variance'),
  ],
  shutil: [
    member('copy', 'copy(src, dst)', 'copy a file and its permissions'),
    member('copyfile', 'copyfile(src, dst)', 'copy the contents of a file'),
    member('move', 'move(src, dst)', 'move a file or directory'),
    member('rmtree', 'rmtree(path)', 'delete a directory tree'),
  ],
  tempfile: [
    member('NamedTemporaryFile', 'NamedTemporaryFile(**kwargs)', 'create a named temporary file'),
    member('TemporaryDirectory', 'TemporaryDirectory(**kwargs)', 'create a temporary directory'),
    member('mkstemp', 'mkstemp() → (fd, path)', 'create a temporary file safely'),
  ],
  hashlib: [
    member('md5', 'md5(data=b\'\') → hash', 'MD5 hash object'),
    member('sha256', 'sha256(data=b\'\') → hash', 'SHA-256 hash object'),
    member('new', 'new(name, data=b\'\') → hash', 'create a hash object by name'),
  ],
  uuid: [
    member('uuid4', 'uuid4() → UUID', 'random UUID'),
    member('uuid1', 'uuid1() → UUID', 'UUID based on the host and time'),
  ],
};

export const PYTHON_SNIPPETS: PythonCompletionItem[] = [
  snippet(
    'def function_name(args):',
    'def function_name(args): · function definition',
    'def function_name(args):\n    pass',
    'Define a function with a body to fill in.',
  ),
  snippet(
    'class ClassName:',
    'class ClassName: · class definition',
    'class ClassName:\n    def __init__(self):\n        pass',
    'Define a class with an initializer.',
  ),
  snippet(
    'for item in items:',
    'for item in items: · for loop',
    'for item in items:\n    pass',
    'Iterate over an iterable.',
  ),
  snippet(
    'if condition:',
    'if condition: · conditional',
    'if condition:\n    pass\nelif other_condition:\n    pass\nelse:\n    pass',
    'Branch on a condition with elif and else.',
  ),
  snippet(
    'try:',
    'try: · exception handling',
    'try:\n    pass\nexcept Exception as error:\n    pass',
    'Handle an exception raised by the guarded block.',
  ),
  snippet(
    'with open(...) as file:',
    'with open(...) as file: · context manager',
    'with open("file.txt", "r", encoding="utf-8") as file:\n    pass',
    'Open a file and close it automatically.',
  ),
  snippet(
    'if __name__ == "__main__":',
    'if __name__ == "__main__": · main()',
    'if __name__ == "__main__":\n    main()',
    'Run main() only when this file is executed as a script.',
  ),
];

export function moduleMembers(name: string): PythonCompletionItem[] {
  return PYTHON_STDLIB_MEMBERS[name] ?? [];
}
