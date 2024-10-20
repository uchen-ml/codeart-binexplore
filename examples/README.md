# Examples

This directory will contain examples of objdump output we will have to deal with. 

## 1. Debug build with symbols.

To compile:
```bash
c++ -O0 -g --std=c++20 examples/src/main.cc -o examples/vector_debug
```
(-O0 is used to disable optimizations, -g is used to include debug symbols)

Objdump output:
```bash
objdump -d -S examples/vector_debug > examples/vector_debug.objdump
```

Objdump sources list:
```bash
objdump -g examples/vector_debug > examples/vector_debug_debugging.objdump
objdump -g examples/vector_debug | grep '\.cpp\|\.c\|\.cc' > examples/vector_debug_sources.txt
```

## 2. Optimized build, no symbols.

To compile:
```bash
c++ -s -O3 --std=c++20 examples/src/main.cc -o examples/vector_release
```
(-s is used to strip symbols, -O3 is used to enable optimizations)

Objdump output:
```bash
objdump -d examples/vector_release > examples/vector_release.objdump
```

Objdump sources list:
```bash
objdump -g examples/vector_release > examples/vector_release_debugging.objdump
objdump -g examples/vector_release | grep '\.cpp\|\.c\|\.cc' > examples/vector_release_sources.txt
```

## 3. Object file, debug build with symbols.

```bash
c++ -O0 -g -c examples/src/mmul.cc -o examples/mmul_debug.o
```

Objdump output:
```bash
objdump -d -S examples/mmul_debug.o > examples/mmul_debug.objdump
```

Objdump sources list:
```bash
objdump -g examples/mmul_debug.o > examples/mmul_debug_debugging.objdump
objdump -g examples/mmul_debug.o | grep '\.cpp\|\.c\|\.cc' > examples/mmul_debug_sources.txt
```

## 4. Object file, optimized build, no symbols.

```bash
c++ -O3 -s -c -march=sandybridge examples/src/mmul.cc -o examples/mmul_release.o
```

Objdump output:
```bash
objdump -d -S examples/mmul_release.o > examples/mmul_release.objdump
```

Objdump sources list:
```bash
objdump -g examples/mmul_release.o > examples/mmul_release_debugging.objdump
objdump -g examples/mmul_release.o | grep '\.cpp\|\.c\|\.cc' > examples/mmul_release_sources.txt
```
