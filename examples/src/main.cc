#include "vector.h"
#include <iostream>

int main() {
  Vector v1{1.0f, 2.0f, 3.0f};
  Vector v2{4.0f, 5.0f, 6.0f};
  for (const auto &elem : (v1 + v2).data()) {
    std::cout << elem << ' ';
  }
  std::cout << '\n';
  return 0;
}