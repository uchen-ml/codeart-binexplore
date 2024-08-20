#ifndef __VECTOR_H__
#define __VECTOR_H__

#include <initializer_list>
#include <span>
#include <vector>

class Vector {
public:
  Vector(std::initializer_list<float> init) : data_(std::move(init)) {}
  std::span<const float> data() const { return data_; }
  Vector &operator+=(const Vector &rhs) {
    for (size_t i = 0; i < data_.size(); ++i) {
      data_[i] += rhs.data_[i];
    }
    return *this;
  }

private:
  std::vector<float> data_;
};

Vector operator+(Vector lhs, const Vector &rhs) { return lhs += rhs; }

#endif // __VECTOR_H__