#include <cstddef>

namespace binexplore {

class MatrixPimpl;

class Matrix {
public:
  Matrix() = default;
  Matrix(size_t height, size_t width);
  size_t get_height() const;
  size_t get_width() const;
  float get(size_t i, size_t j) const;
  void set(size_t i, size_t j, float value);

private:
  MatrixPimpl *pimpl_;
};

Matrix mul(const Matrix &lhs, const Matrix &rhs) {
  Matrix result(lhs.get_height(), rhs.get_width());
  for (size_t i = 0; i < lhs.get_height(); ++i) {
    for (size_t j = 0; j < rhs.get_width(); ++j) {
      float sum = 0.0f;
      for (size_t k = 0; k < lhs.get_width(); ++k) {
        sum += lhs.get(i, k) * rhs.get(k, j);
      }
      result.set(i, j, sum);
    }
  }
  return result;
}

} // namespace binexplore