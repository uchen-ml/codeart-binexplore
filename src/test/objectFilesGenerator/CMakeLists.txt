cmake_minimum_required(VERSION 3.12)
project(FakeTest)

# Add the main.cpp file
add_executable(main main.cpp)

set(CMAKE_INSTALL_PREFIX ${CMAKE_SOURCE_DIR}/deploy)

# Generate object files if possible
set_target_properties(main PROPERTIES
    CXX_STANDARD 11
    CXX_STANDARD_REQUIRED YES
    CXX_EXTENSIONS YES
)

# Platform-specific settings
if(UNIX)
    # Linux and macOS
    target_compile_options(main PRIVATE -Wall -Wextra)
elseif(WIN32)
    # Windows
    target_compile_options(main PRIVATE /W4)
endif()

# Install the executable
install(TARGETS main DESTINATION ${CMAKE_INSTALL_PREFIX})

install(DIRECTORY ${CMAKE_BINARY_DIR}/CMakeFiles/main.dir/
    DESTINATION ${CMAKE_SOURCE_DIR}/deploy
    FILES_MATCHING
    PATTERN "*.o"
)