import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SmartLibraryApp() {
  // 로그인 및 인증 상태 관리
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // 로그인/회원가입 입력 Form 상태
  const [authStudentId, setAuthStudentId] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPin, setAuthPin] = useState('');

  // 현재 로그인한 사용자 정보 상태
  const [currentUser, setCurrentUser] = useState({ studentId: '', name: '김규빈', pin: '' });

  // 메인 화면 탭 상태 ('home' | 'explore')
  const [currentTab, setCurrentTab] = useState<'home' | 'explore'>('home');
  // 유저 포인트 (기본 1000포인트 지급), 쿠폰, 스탬프 상태
  const [userPoints, setUserPoints] = useState(1000);
  const [userStamps, setUserStamps] = useState(0);
  // 도서 대여 쿠폰함 목록 상태 수정 후 (쿠폰 0개부터 시작)
  const [rentalCoupons, setRentalCoupons] = useState<any[]>([]);
  // 포인트로 변환한 상용 기프트콘 혜택 쿠폰함 목록 상태
  const [exchangedGifticons, setExchangedGifticons] = useState<any[]>([]);
  // 내 추천 코드
  const myReferralCode = 'KUBIN2026';
  // 모달 팝업 제어 상태
  const [modalType, setModalType] = useState<string | null>(null);
  // 대여 프로세스 세부 단계 제어
  const [rentStep, setRentStep] = useState<'selectBook' | 'selectType' | 'selectPayment'>('selectBook');
  const [selectedBookForRent, setSelectedBookForRent] = useState<any>(null);
  const [selectedRentalType, setSelectedRentalType] = useState<{ name: string; hours: number; basePoints: number } | null>(null);
  
  // 도서 대여 검색어 상태
  const [searchQuery, setSearchQuery] = useState('');
  // 2단계 보안 카운트다운 타이머 상태 (1분 = 60초 제한)
  const [timeLeft, setTimeLeft] = useState(60);
  // 2단계 시퀀셜 보안 인증 단계 상태
  const [authStep, setAuthStep] = useState<'step1_keypad' | 'step2_assigned'>('step1_keypad');
  const [step1Pin, setStep1Pin] = useState<string>('');
  const [step2Pin, setStep2Pin] = useState<string>('');
  
  const [activeLockerInfo, setActiveLockerInfo] = useState<string>('');
  const [highlightZone, setHighlightZone] = useState<string>('');
  const [pendingActionData, setPendingActionData] = useState<any>(null);

  // 보관함별 리미트 스위치 상태 관리
  const [limitSwitches, setLimitSwitches] = useState<{ [key: string]: boolean }>({
    '제1보관함 (전공서적)-1구역': false,
    '제1보관함 (전공서적)-2구역': true,
    '제1보관함 (전공서적)-3구역': false,
    '제1보관함 (전공서적)-4구역': true,
    '제1보관함 (전공서적)-5구역': false,
    '제2보관함 (자격증서적)-1구역': true,
    '제2보관함 (자격증서적)-2구역': false,
    '제2보관함 (자격증서적)-3구역': false,
    '제2보관함 (자격증서적)-4구역': true,
    '제2보관함 (자격증서적)-5구역': false,
  });

  // TypeScript 타입 정의
  interface Report {
    id: string;
    date: string;
    detail: string;
    image: string;
    reporter: string;
  }

  interface Book {
    id: string;
    title: string;
    author: string;
    publisher: string;
    condition: string;
    storageNo: string;
    lockerNo: string;
    status: string;
    owner: string;
    ownerPin: string;
    borrower: string;
    extensionCount: number;
    maxExtensions: number;
    initialHours: number;
    rentalTimeLeft: number;
    image: string;
    reports: Report[];
  }

  // 도서 목록 상태 및 서버 fetch 연동 코드
 // 도서 목록 상태 및 서버 fetch 연동 코드
  const [books, setBooks] = useState<Book[]>([]);

  // ▼ [수정 1] fetchBooks 함수를 useEffect 바깥(컴포넌트 최상단)으로 분리
  const fetchBooks = async () => {
    if (!isLoggedIn) return; // 로그인 상태가 아닐 경우 도서 목록 조회 안 함
    try {
      const serverUrl = "https://snappingly-noncarnivorous-taren.ngrok-free.dev";
     const response = await fetch(`${serverUrl}/api/books`, {
  headers: {
    'ngrok-skip-browser-warning': '69420',
  },
});
      if (!response.ok) {
        // ⬅️ 아래 줄들을 추가해서 서버가 보낸 에러 내용을 터미널에 확인해보세요!
  const errorText = await response.text();
  console.log("서버가 도서 목록 조회를 거절한 이유:", errorText);

        throw new Error('서버에서 도서 목록을 불러오지 못했습니다.');
      }
      const serverData = await response.json();
      console.log("서버에서 받아온 책 목록 원본 데이터:", serverData);
      const mappedBooks = serverData.map((item: any) => {
      let calculatedLeft = 3600; // 기본값 1시간

      if (item.rentalDueDate) {
  // ISO 포맷('T' 포함) 그대로 Date 객체에 전달하거나, 'T'를 ' '로 바꿀 때 하이픈/콜론 유의
  const dueTime = new Date(item.rentalDueDate).getTime();
  const nowTime = new Date().getTime();
  const diff = Math.floor((dueTime - nowTime) / 1000);
  
  console.log("⏰ 타이머 계산 디버깅 -> 마감시각:", item.rentalDueDate, "/ 남은초:", diff);

  if (!isNaN(diff) && diff > 0) {
    calculatedLeft = diff;
  }
} else if (item.rentalTimeLeft !== undefined && item.rentalTimeLeft > 0) {
        calculatedLeft = item.rentalTimeLeft;
      }

      return {
        id: String(item.id || item.book_id || ''),
        title: item.title || '',
        author: item.author || '',
        publisher: item.publisher || '기타출판사',
        condition: item.condition || item.book_condition || 'A급',
        storageNo: item.storageNo || '제1보관함 (전공서적)',
        lockerNo: item.lockerNo || '1구역',
        status: (item.isAvailable === false || item.status === '대여 중' || (item.borrower && item.borrower.trim() !== '')) ? '대여 중' : '대여 가능',
        owner: item.owner || '',
        ownerPin: item.ownerPin || '',
        borrower: item.borrower || '',
        extensionCount: item.extensionCount || 0,
        maxExtensions: (item.rentalHours === 24 || calculatedLeft > 10800) ? 0 : (item.maxExtensions ?? 2),
initialHours: (item.rentalHours === 24 || calculatedLeft > 10800) ? 24 : (item.initialHours || 1),
        rentalTimeLeft: calculatedLeft,
        image: item.image || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300',
        reports: (item.reports || []).map((rep: any) => ({
      id: String(rep.id || ''),
      date: rep.date || rep.report_time || '',
      detail: rep.detail || rep.content || '', // 👈 서버 DB의 content를 detail로 연결!
      image: rep.image || '',
      reporter: rep.reporter || '',
    })),
  };
});
      setBooks(mappedBooks);
    } catch (error) {
      console.error('도서 목록 통신 에러:', error);
    }
  };

  // ▼ [수정 2] useEffect는 선언된 fetchBooks 함수를 호출만 하도록 아주 짧게 변경
  useEffect(() => {
    fetchBooks();
  }, [isLoggedIn]);

  // 신규 책 등록 폼 상태
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newPublisher, setNewPublisher] = useState('');
  const [newOwnerName, setNewOwnerName] = useState(currentUser.name);
  const [newOwnerPin, setNewOwnerPin] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('제1보관함 (전공서적)');
  const [selectedCondition, setSelectedCondition] = useState('A급');
  const [bookImageUri, setBookImageUri] = useState('https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300');
  
  // 친구 추천 코드 입력 상태
  const [inputReferralCode, setInputReferralCode] = useState('');
  
  // 분실/파손 신고 관련 상태
  const [selectedBookForReport, setSelectedBookForReport] = useState<any>(null);
  const [reportDetail, setReportDetail] = useState('');
  const [reportImageUri, setReportImageUri] = useState('https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300');
  const [reportCurrentDate, setReportCurrentDate] = useState('');

  // 원주인 인증 및 판별 상태
  const [inputingPinForBookId, setInputingPinForBookId] = useState<string | null>(null);
  const [inputingReportId, setInputingReportId] = useState<string | null>(null);
  const [enteredOwnerPin, setEnteredOwnerPin] = useState('');
  const [isOwnerVerified, setIsOwnerVerified] = useState(false);

  // 로그인 및 회원가입 처리 함수
const handleLogin = async () => {
  if (!authStudentId || !authPin) {
    Alert.alert('오류', '학번과 고유 비밀번호를 모두 입력해주세요.');
    return;
  }

  try {
    const serverUrl = "https://snappingly-noncarnivorous-taren.ngrok-free.dev";

    const response = await fetch(`${serverUrl}/api/login`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420', // ⬅️ 여기 추가
  },
  body: JSON.stringify({ studentId: authStudentId, pin: authPin }),
});

    const textData = await response.text(); // 에러 발생 시 텍스트로 먼저 받기
    let data;
    try {
      data = JSON.parse(textData);
    } catch (err) {
      console.log("서버가 JSON이 아닌 텍스트를 반환함:", textData);
      throw new Error("서버 응답 형식이 올바르지 않습니다.");
    }

    if (response.ok && data.success) {
      setCurrentUser({ studentId: authStudentId, name: data.name, pin: authPin });
      setNewOwnerName(data.name);
      setUserPoints(data.points !== undefined ? data.points : 1000);
      setRentalCoupons(data.coupons || []);
      setUserStamps(data.stamps || 0);
      setIsLoggedIn(true);
      Alert.alert('로그인 성공', `${data.name}님 환영합니다!`);
    } else {
      Alert.alert('로그인 실패', data.message || '학번 또는 고유 비밀번호가 일치하지 않습니다.');
    }
  } catch (e) {
    console.error("로그인 통신 에러 상세:", e);
    Alert.alert('서버 오류', '서버와 통신할 수 없습니다. ngrok 주소나 서버 상태를 확인해주세요.');
  }
};

  const handleSignup = async () => {
    if (!authStudentId || !authName || !authPin || authPin.length < 4) {
      Alert.alert('오류', '학번, 이름, 그리고 4자리 이상의 PIN 번호를 모두 입력해주세요.');
      return;
    }

    try {
      const serverUrl = "https://snappingly-noncarnivorous-taren.ngrok-free.dev";
      const response = await fetch(`${serverUrl}/api/signup`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420', // ⬅️ 여기 추가
  },
  body: JSON.stringify({ studentId: authStudentId, name: authName, pin: authPin }),
});

      const data = await response.json();

      if (response.ok) {
        Alert.alert('회원가입 완료', '성공적으로 가입되었습니다. 로그인해주세요.');
        setAuthMode('login');
        setAuthPin('');
      } else {
        Alert.alert('가입 실패', data.message || '이미 가입된 학번이거나 잘못된 정보입니다.');
      }
    } catch (e) {
      Alert.alert('서버 오류', '서버와 통신할 수 없습니다. 서버 주소(.env)를 확인해주세요.');
    }
  };

   const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '확인',
        onPress: () => {
          setIsLoggedIn(false);
          setAuthStudentId('');
          setAuthPin('');
          setAuthName('');
          
          // ▼ [수정] 로그아웃 시 다음 사용자를 위해 모든 개인 데이터 초기화
          setUserPoints(1000);
          setUserStamps(0);
          setRentalCoupons([]);
          setExchangedGifticons([]);
        }
      }
    ]);
  };

  // 포인트 차감 계산 함수
  const calculateRequiredPoints = (hours: number, condition: string) => {
    const isS = condition.includes('S급');
    const isA = condition.includes('A급');
    const isB = condition.includes('B급');
    const isC = condition.includes('C급');
    if (hours === 1) {
      if (isS) return 100;
      if (isA) return 90;
      if (isB) return 80;
      if (isC) return 70;
      return 100;
    } else if (hours === 2) {
      if (isS) return 200;
      if (isA) return 180;
      if (isB) return 160;
      if (isC) return 140;
      return 200;
    } else if (hours === 24) {
      if (isS) return 500;
      if (isA) return 490;
      if (isB) return 480;
      if (isC) return 470;
      return 500;
    }
    return 100;
  };

  // 대여 시간 카운트다운 훅 (로그아웃 여부와 관계없이 대여 중인 책의 시간이 흐르도록 수정)
  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setBooks((prevBooks) =>
        prevBooks.map((book) => {
          // 대여 중이고 남은 시간이 있다면 1초씩 감소
          if (book.status === '대여 중' && book.rentalTimeLeft > 0) {
            const nextTime = book.rentalTimeLeft - 1;
            if (nextTime === 0) {
              Alert.alert(
                '서비스 이용 정지 경고',
                `[${book.title}] 반납 기한을 초과하였습니다!\n규정을 1회 위반하였으므로 즉시 재가입 및 서비스 이용이 중지됩니다.`
              );
            }
            return { ...book, rentalTimeLeft: nextTime };
          }
          return book;
        })
      );
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, []); // 의존성 배열을 비워두어 앱 실행 내내 안정적으로 타이머가 작동하게 합니다.

  // 보안 인증 타이머 훅
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (modalType === 'pinAuth' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (modalType === 'pinAuth' && timeLeft === 0) {
      Alert.alert('시간 초과', '보안 인증 시간(60초)이 만료되었습니다. 다시 시도해주세요.');
      setModalType(null);
    }
    return () => clearInterval(timer);
  }, [modalType, timeLeft]);

  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handlePickSampleImage = () => {
    const sampleImages = [
      'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300'
    ];
    const randomImg = sampleImages[Math.floor(Math.random() * sampleImages.length)];
    setBookImageUri(randomImg);
    Alert.alert('사진 등록 완료', '도서 실물 사진이 성공적으로 첨부되었습니다.');
  };

  const handlePickReportImage = () => {
    const sampleImages = [
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300',
      'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300'
    ];
    const randomImg = sampleImages[Math.floor(Math.random() * sampleImages.length)];
    setReportImageUri(randomImg);
    Alert.alert('사진 첨부 완료', '파손/분실 부위 사진이 첨부되었습니다.');
  };

  const openReportModal = () => {
    const myRentedBooks = books.filter((b) => b.borrower === currentUser.name);
    if (myRentedBooks.length === 0) {
      Alert.alert('신고 불가', '현재 대여 중인 도서가 없어 분실/파손 신고를 접수할 수 없습니다.');
      return;
    }
    const now = new Date();
    const formattedDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setReportCurrentDate(formattedDate);
    setSelectedBookForReport(myRentedBooks[0]);
    setReportDetail('');
    setModalType('damageReport');
  };

  const handleSubmitReport = async () => {
  if (!reportDetail) {
    Alert.alert('오류', '상세 내용을 입력해주세요.');
    return;
  }
  if (!selectedBookForReport) {
    Alert.alert('오류', '신고할 도서를 선택해주세요.');
    return;
  }

  try {
    const serverUrl = "https://snappingly-noncarnivorous-taren.ngrok-free.dev";
    
    // 1. 서버 DB에 파손/분실 신고 전송
    const response = await fetch(`${serverUrl}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
       'ngrok-skip-browser-warning': '69420' 
       },
      body: JSON.stringify({
        bookId: selectedBookForReport.id,
        reporter: currentUser.name,
        detail: reportDetail,
        image: reportImageUri,
        date: reportCurrentDate,
      }),
    });

    if (!response.ok) {
      throw new Error('서버 신고 접수 실패');
    }

    Alert.alert(
      '파손/분실 신고 접수 완료',
      `[접수일시: ${reportCurrentDate}]\n책 주인(${selectedBookForReport.owner})님에게 알림이 전송되었습니다.`
    );

    setModalType(null);
    setReportDetail('');
    
    // 2. 서버에서 최신 도서 및 신고 목록을 다시 불러와 화면 동기화
    fetchBooks(); 
  } catch (error) {
    console.error('신고 통신 에러:', error);
    Alert.alert('오류', '신고 통신 중 문제가 발생했습니다.');
  }
};

  const handleVerifyOwnerPin = (correctPin: string) => {
    if (enteredOwnerPin !== correctPin) {
      Alert.alert('인증 실패', '책 주인의 고유 비밀번호가 일치하지 않습니다.');
      setIsOwnerVerified(false);
      return;
    }
    Alert.alert('인증 성공', '책 주인으로 확인되었습니다. 처리 버튼을 선택해주세요.');
    setIsOwnerVerified(true);
  };

  const executeLowerCondition = async (bookId: string, reportId: string) => {
    //서버 DB에서 해당 신고 삭제 요청
    try {
    const serverUrl = "https://snappingly-noncarnivorous-taren.ngrok-free.dev";
    await fetch(`${serverUrl}/api/reports/${reportId}`, { method: 'DELETE' });
  } catch (error) {
    console.error('신고 삭제 통신 에러:', error);
  }

    setBooks(
      books.map((b) => {
        if (b.id === bookId) {
          let nextCondition = b.condition;
          if (b.condition === 'S급') nextCondition = 'A급';
          else if (b.condition === 'A급') nextCondition = 'B급';
          else if (b.condition === 'B급') nextCondition = 'C급';
          else nextCondition = 'C급 (파손 심함)';
          const updatedReports = b.reports.filter((r) => r.id !== reportId);
          Alert.alert('등급 조정 완료', `[${b.title}]의 등급이 [${nextCondition}]로 하향 조정되었습니다.`);
          return { ...b, condition: nextCondition, reports: updatedReports };
        }
        return b;
      })
    );
    setInputingPinForBookId(null);
    setInputingReportId(null);
    setEnteredOwnerPin('');
    setIsOwnerVerified(false);
  };

  const executeKeepCondition = async (bookId: string, reportId: string) => {
    
    try {
  const serverUrl = "https://snappingly-noncarnivorous-taren.ngrok-free.dev";
  await fetch(`${serverUrl}/api/reports/${reportId}`, { method: 'DELETE' });
} catch (error) {
  console.error('신고 삭제 통신 에러:', error);
}
    
    setBooks(
      books.map((b) => {
        if (b.id === bookId) {
          const updatedReports = b.reports.filter((r) => r.id !== reportId);
          Alert.alert('신고 처리 완료', '허위 신고로 판별되어 등급을 유지한 채 신고 건이 처리되었습니다.');
          return { ...b, reports: updatedReports };
        }
        return b;
      })
    );
    setInputingPinForBookId(null);
    setInputingReportId(null);
    setEnteredOwnerPin('');
    setIsOwnerVerified(false);
  };

  const executeCancelReport = async (bookId: string, reportId: string) => {
    
    try {
  const serverUrl = "https://snappingly-noncarnivorous-taren.ngrok-free.dev";
  await fetch(`${serverUrl}/api/reports/${reportId}`, { method: 'DELETE' });
} catch (error) {
  console.error('신고 삭제 통신 에러:', error);
}

    setBooks(
      books.map((b) => {
        if (b.id === bookId) {
          const updatedReports = b.reports.filter((r) => r.id !== reportId);
          Alert.alert('신고 취소 완료', '신고 내역이 안전하게 취소되었습니다.');
          return { ...b, reports: updatedReports };
        }
        return b;
      })
    );
  };

  const handleExchangeGifticon = (giftName: string) => {
    const cost = 1000;
    if (userPoints < cost) {
      Alert.alert('포인트 부족', `포인트가 부족합니다! (필요: ${cost}P / 보유: ${userPoints}P)`);
      return;
    }
    setUserPoints(userPoints - cost);
    const newCoupon = {
      id: Date.now().toString(),
      name: giftName,
      date: `${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')} 교환됨`,
    };
    setExchangedGifticons([newCoupon, ...exchangedGifticons]);
    Alert.alert('기프트콘 변환 완료!', `[${giftName}]\n성공적으로 교환되었습니다! (-1,000P)`);
    setModalType(null);
  };

  const handleSelectBookItem = (book: any) => {
    setSelectedBookForRent(book);
    setRentStep('selectType');
  };

  const handleSelectRentalType = (typeObj: { name: string; hours: number; basePoints: number }) => {
    setSelectedRentalType(typeObj);
    setRentStep('selectPayment');
  };

  const initiateRentProcess = (paymentMethod: string) => {
    const totalRequiredPoints = selectedBookForRent && selectedRentalType
      ? calculateRequiredPoints(selectedRentalType.hours, selectedBookForRent.condition)
      : 100;
    if (paymentMethod === 'points' && userPoints < totalRequiredPoints) {
      Alert.alert('알림', `포인트가 부족합니다! (필요 포인트: ${totalRequiredPoints}P)`);
      return;
    }
    if (paymentMethod !== 'points' && rentalCoupons.length <= 0) {
      Alert.alert('알림', '사용 가능한 도서 대여 쿠폰이 없습니다.');
      return;
    }
    const targetBook = selectedBookForRent;
    if (!targetBook) return;
    setStep1Pin(generateRandomPin());
    setAuthStep('step1_keypad');
    setTimeLeft(60);
    setPendingActionData({ type: 'rent', bookId: targetBook.id, targetBook, paymentMethod, rentalType: selectedRentalType, totalRequiredPoints });
    setActiveLockerInfo('도서 대여 도어락 개방');
    setHighlightZone(`${targetBook.storageNo}\n${targetBook.lockerNo}`);
    setModalType('pinAuth');
  };

  const initiateReturnProcess = (bookId: string) => {
    const targetBook = books.find((b) => b.id === bookId);
    if (!targetBook) return;
    setStep1Pin(generateRandomPin());
    setAuthStep('step1_keypad');
    setTimeLeft(60);
    setPendingActionData({ type: 'return', bookId: targetBook.id, storageNo: targetBook.storageNo, lockerNo: targetBook.lockerNo });
    setActiveLockerInfo('선택한 도서 반납 구역');
    setHighlightZone(`${targetBook.storageNo}\n${targetBook.lockerNo}`);
    setModalType('pinAuth');
  };

  const initiateRegisterProcess = () => {
    if (!newTitle || !newAuthor) {
      Alert.alert('오류', '책 이름과 저자를 입력해주세요.');
      return;
    }
    const zones = ['1구역', '2구역', '3구역', '4구역', '5구역'];
    const emptyZone = zones.find((zone) => limitSwitches[`${selectedStorage}-${zone}`] === false);
    if (!emptyZone) {
      Alert.alert('보관함 만석', `선택하신 [${selectedStorage}]의 모든 구역이 가득 찼습니다.`);
      return;
    }
    setStep1Pin(generateRandomPin());
    setAuthStep('step1_keypad');
    setTimeLeft(60);
    setPendingActionData({
      type: 'register',
      bookInfo: {
        id: Date.now().toString(),
        title: newTitle,
        author: newAuthor,
        publisher: newPublisher || '기타출판사',
        condition: selectedCondition,
        storageNo: selectedStorage,
        lockerNo: emptyZone,
        status: '대여 가능',
        owner: currentUser.name,        // 로그인한 사용자 이름 자동 연동
        ownerPin: currentUser.pin,      // 회원가입 시 등록한 고유 비밀번호(PIN) 자동 연동
        borrower: '',
        extensionCount: 0,
        maxExtensions: 2,
        initialHours: 1,
        rentalTimeLeft: 0,
        image: bookImageUri,
        reports: [],
      },
    });
    setActiveLockerInfo('자동 배정된 보관 구역');
    setHighlightZone(`${selectedStorage}\n${emptyZone}`);
    setModalType('pinAuth');
  };

  const initiateRetrieveProcess = (bookId: string) => {
    const targetBook = books.find((b) => b.id === bookId);
    if (!targetBook) return;
    if (targetBook.status === '대여 중') {
      Alert.alert('회수 불가', '현재 다른 사용자가 대여 중인 도서는 회수할 수 없습니다.');
      return;
    }
    setStep1Pin(generateRandomPin());
    setAuthStep('step1_keypad');
    setTimeLeft(60);
    setPendingActionData({ type: 'retrieve', bookId, targetBook });
    setActiveLockerInfo('도서 회수 위치');
    setHighlightZone(`${targetBook.storageNo}\n${targetBook.lockerNo}`);
    setModalType('pinAuth');
  };

  const handleStep1KeypadSuccess = () => {
    const newAssignedPin = generateRandomPin();
    setStep2Pin(newAssignedPin);
    setAuthStep('step2_assigned');
  };

  const handleFinalDoorOpenConfirm = async () => {
    const serverUrl = "https://snappingly-noncarnivorous-taren.ngrok-free.dev";
    if (pendingActionData.type === 'register') {
  try {
    const newBookInfo = pendingActionData.bookInfo;
    const response = await fetch(`${serverUrl}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420'
       },
      body: JSON.stringify({
        title: newBookInfo.title,
        author: newBookInfo.author,
        publisher: newBookInfo.publisher,
        condition: newBookInfo.condition,
        storageNo: newBookInfo.storageNo,
        lockerNo: newBookInfo.lockerNo,
        owner: newBookInfo.owner,
        ownerPin: newBookInfo.ownerPin,
        image: newBookInfo.image,
      }),
    });

    const responseText = await response.text();
    const rawBookFromDB = responseText ? JSON.parse(responseText) : {};

    if (response.ok) {
      // 서버 DB에 포인트 100점 증가 요청
try {
  await fetch(`${serverUrl}/api/users/points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '69420'
     },
    body: JSON.stringify({
      studentId: currentUser.studentId, // 👈 username 대신 studentId 전송!
      points: userPoints + 100,         // 👈 amount 대신 최종 포인트(현재 + 100) 전송!
    }),
  });
} catch (pErr) {
  console.error('포인트 적립 통신 실패:', pErr);
}

      setUserPoints((prev) => prev + 100);

      const savedBookFromDB = {
        id: String(rawBookFromDB.id || rawBookFromDB.book_id || Date.now()),
        title: rawBookFromDB.title || newBookInfo.title,
        author: rawBookFromDB.author || newBookInfo.author,
        publisher: rawBookFromDB.publisher || newBookInfo.publisher || '기타출판사',
        condition: rawBookFromDB.condition || newBookInfo.condition || 'A급',
        storageNo: rawBookFromDB.storageNo || newBookInfo.storageNo || '제1보관함 (전공서적)',
        lockerNo: rawBookFromDB.lockerNo || newBookInfo.lockerNo || '1구역',
        status: '대여 가능',
        owner: rawBookFromDB.owner || newBookInfo.owner,
        ownerPin: rawBookFromDB.ownerPin || newBookInfo.ownerPin,
        borrower: '',
        extensionCount: 0,
        maxExtensions: 2,
        initialHours: 1,
        rentalTimeLeft: 3600,
        image: rawBookFromDB.image || newBookInfo.image || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300',
        reports: [],
      };

      setBooks((prev) => [...prev, savedBookFromDB]);
      Alert.alert('보관 완료', '보관함 문이 열렸습니다. 책을 넣어주세요! (+100 포인트 적립)');
      fetchBooks();
    } else {
      Alert.alert('오류', '도서 등록에 실패했습니다.');
    }
  } catch (error) {
    console.error('도서 등록 통신 에러:', error);
    Alert.alert('오류', '서버 통신 중 오류가 발생했습니다.');
  }
} else if (pendingActionData.type === 'rent') {
  const rentalType = pendingActionData.rentalType;
  const paymentMethod = pendingActionData.paymentMethod;
  const totalCost = pendingActionData.totalRequiredPoints;
  const targetBook = pendingActionData.targetBook;
  try {
        // 전송하기 전에 값이 제대로 잡혀 있는지 콘솔로 확인
        console.log("📤 서버로 보내는 대여 데이터:", {
          bookId: targetBook.id,
          userId: currentUser.name, // 서버가 request.get("userId")로 받으므로 키를 userId로 맞춤!
          userName: currentUser.name, // 혹시 몰라 userName도 같이 동봉
        });

        const response = await fetch(`${serverUrl}/api/rentals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '69420'
           },
          body: JSON.stringify({
            bookId: targetBook.id,
            userId: currentUser.name,   // 👈 서버 캡처 코드의 request.get("userId")와 일치시킴
            userName: currentUser.name, // 👈 혹시 서버가 나중에 바꿀 것을 대비해 같이 전송
            paymentMethod: paymentMethod,
            rentalHours: rentalType.hours,
            totalPoints: totalCost,
          }),
        });

    // 2. 서버 응답 에러 검사
        if (!response.ok) {
          const errText = await response.text();
          console.log("❌ 서버가 거절한 이유 (응답 텍스트):", errText); // 이 줄을 추가!
          throw new Error(errText || '서버 대여 처리에 실패했습니다.');
        }

    if (paymentMethod === 'points') {
      setUserPoints((prev) => prev - totalCost);
    } else {
      setRentalCoupons((prev) => prev.slice(1));
    }
        
        const maxExt = rentalType.hours === 24 ? 0 : 2;
        const initialSeconds = rentalType.hours * 3600;
        setBooks((prevBooks) =>
          prevBooks.map((b) =>
            b.id === targetBook.id
              ? {
                  ...b,
                  status: '대여 중',
                  borrower: currentUser.name,
                  extensionCount: 0,
                  maxExtensions: maxExt,
                  initialHours: rentalType.hours,
                  rentalTimeLeft: initialSeconds,
                }
              : b
          )
        );
        setLimitSwitches((prev) => ({
          ...prev,
          [`${targetBook.storageNo}-${targetBook.lockerNo}`]: false,
        }));
        Alert.alert('대여 완료', `[${rentalType.name} 대여 시작]\n도어락이 열렸습니다.`);
      } catch (error) {
        Alert.alert('오류', '대여 통신 중 문제가 발생했습니다.');
      }
    } else if (pendingActionData.type === 'return') {
      const { bookId, storageNo, lockerNo } = pendingActionData;

      try {
        // 서버 DB에도 반납 상태를 영구적으로 반영하기 위한 통신 추가
        const response = await fetch(`${serverUrl}/api/returns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '69420'
           },
          body: JSON.stringify({
            bookId: bookId,
            userName: currentUser.name,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.log("서버 반납 거절 이유:", errText);
        }
      } catch (error) {
        console.error('반납 통신 에러:', error);
      }

      setBooks(
        books.map((b) => (b.id === bookId ? { ...b, status: '대여 가능', borrower: '', extensionCount: 0, rentalTimeLeft: 0 } : b))
      );
      setLimitSwitches((prev) => ({
        ...prev,
        [`${storageNo}-${lockerNo}`]: true,
      }));
      Alert.alert('반납 완료', '지정 구역에 반납이 완료되었습니다.');
    } else if (pendingActionData.type === 'retrieve') {
      const target = pendingActionData.targetBook;
      try {
        await fetch(`${serverUrl}/api/books/${target.id}`, { method: 'DELETE' });
        setBooks(books.filter((b) => b.id !== target.id));
        setLimitSwitches((prev) => ({
          ...prev,
          [`${target.storageNo}-${target.lockerNo}`]: false,
        }));
        Alert.alert('회수 완료', '보관함에서 책을 꺼내주세요.');
      } catch (error) {
        Alert.alert('오류', '회수 통신 중 문제가 발생했습니다.');
      }
    }
    setModalType(null);
  };

  const handleApplyReferral = () => {
    if (!inputReferralCode) {
      Alert.alert('오류', '추천 코드를 입력해주세요.');
      return;
    }
    setRentalCoupons((prev) => [
      { id: Date.now().toString(), name: '친구 추천 보상 대여 쿠폰', date: '방금 전 지급' },
      ...prev,
    ]);
    setUserPoints(userPoints + 100);
    Alert.alert('보상 지급 완료', '양방향 추천 보상으로 +100P와 도서 대여 쿠폰 1장이 지급되었습니다!');
    setInputReferralCode('');
    setModalType(null);
  };

  const handleExtendRental = (bookId: string) => {
    setBooks((prevBooks) =>
      prevBooks.map((b) => {
        if (b.id === bookId) {
          if (b.maxExtensions === 0) {
            Alert.alert('연장 불가', '종일권은 연장 기능을 지원하지 않습니다.');
            return b;
          }
          
          if (b.extensionCount >= b.maxExtensions) {
            Alert.alert('연장 불가', `최대 연장 횟수(${b.maxExtensions}회)를 초과하였습니다.`);
            return b;
          }
          const nextCount = b.extensionCount + 1;
          Alert.alert('연장 완료', '대여 시간이 1시간 연장되었습니다.');
          return { ...b, extensionCount: nextCount, rentalTimeLeft: b.rentalTimeLeft + 3600 };
        }
        return b;
      })
    );
  };

  // 현재 로그인한 사용자가 '책 주인(owner)'이면서 + 신고(reports) 내역이 존재하는 도서만 필터링
const booksWithReports = books.filter(
  (b) => b.owner === currentUser.name && b.reports && b.reports.length > 0
);
  const filteredAvailableBooks = books.filter((b) => {
    if (b.status !== '대여 가능') return false;
    const query = searchQuery.toLowerCase();
    return b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query) || b.owner.toLowerCase().includes(query);
  });

  // -------------------------------------------------------------
  // [추가] 로그인 및 회원가입 화면 UI (isLoggedIn === false 일 때 렌더링)
  // -------------------------------------------------------------
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <View style={styles.authHeaderBox}>
            <Text style={styles.authMainTitle}>IT융합대학 스마트 플랫폼</Text>
            <Text style={styles.authSubTitle}>스마트 무인 도서 대여 서비스</Text>
          </View>

          <View style={styles.authCard}>
            <View style={styles.authTabRow}>
              <TouchableOpacity
                style={[styles.authTabBtn, authMode === 'login' && styles.authTabBtnActive]}
                onPress={() => setAuthMode('login')}
              >
                <Text style={[styles.authTabText, authMode === 'login' && styles.authTabTextActive]}>로그인</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTabBtn, authMode === 'signup' && styles.authTabBtnActive]}
                onPress={() => setAuthMode('signup')}
              >
                <Text style={[styles.authTabText, authMode === 'signup' && styles.authTabTextActive]}>회원가입</Text>
              </TouchableOpacity>
            </View>

            {authMode === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder="이름 입력"
                placeholderTextColor="#64748b"
                value={authName}
                onChangeText={setAuthName}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="학번 입력 (예: 20261234)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={authStudentId}
              onChangeText={setAuthStudentId}
            />

            <TextInput
              style={styles.input}
              placeholder="고유 비밀번호 (PIN 4자리 이상)"
              placeholderTextColor="#64748b"
              secureTextEntry={true}
              keyboardType="numeric"
              value={authPin}
              onChangeText={setAuthPin}
            />

            {authMode === 'login' ? (
              <TouchableOpacity style={styles.submitBtn} onPress={handleLogin}>
                <Text style={styles.submitBtnText}>로그인하기</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.submitBtn} onPress={handleSignup}>
                <Text style={styles.submitBtnText}>회원가입 완료</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // 기존 메인 앱 화면 UI (로그인 완료 시)
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerBanner}>
          <View>
            <Text style={styles.headerTitle}>IT융합대학 스마트 플랫폼</Text>
            <Text style={styles.headerSub}>환영합니다, {currentUser.name}님 ({currentUser.studentId})</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* 로그아웃 버튼 추가 */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={{ color: '#f8fafc', fontSize: 11, fontWeight: 'bold' }}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* 내 포인트 배너 및 포인트 변환 버튼 */}
        <View style={styles.pointCard}>
          <View>
            <Text style={styles.pointCardLabel}>내 포인트 (가입 축하 1000P 지급)</Text>
            <Text style={styles.pointCardValue}>{userPoints.toLocaleString()} P</Text>
          </View>
          <TouchableOpacity style={styles.exchangeHeaderBtn} onPress={() => setModalType('exchangeGifticon')}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>포인트 변환하기</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {currentTab === 'home' ? (
          <>
            {/* 파손 신고 알림 섹션 */}
            {booksWithReports.length > 0 && (
              <View style={styles.notificationAlertBox}>
                <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>
                  [알림] 보관된 도서에 파손/분실 신고가 접수되었습니다! (주인 고유 비밀번호 판별 필요)
                </Text>
                {booksWithReports.map((book) => (
                  <View key={book.id} style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#f59e0b' }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                      도서명: {book.title} | 소유자: <Text style={{ color: '#38bdf8' }}>{book.owner}</Text> (현재 등급: {book.condition})
                    </Text>
                    {book.reports.map((rep) => (
                      <View key={rep.id} style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 6 }}>
                        <Text style={{ color: '#cbd5e1', fontSize: 11 }}>접수일시: {rep.date} / 신고자: {rep.reporter}</Text>
                        <Text style={{ color: '#f8fafc', fontSize: 12, marginTop: 2 }}>내용: {rep.detail}</Text>
                        {inputingPinForBookId === book.id && inputingReportId === rep.id ? (
                          <View style={{ marginTop: 8, backgroundColor: '#1e293b', padding: 8, borderRadius: 6 }}>
                            <Text style={{ color: '#38bdf8', fontSize: 11, marginBottom: 4 }}>책 주인의 고유 비밀번호(4자리) 입력 후 판별</Text>
                            <TextInput
                              style={[styles.input, { height: 36, marginBottom: 6 }]}
                              placeholder="고유 비밀번호 입력"
                              placeholderTextColor="#64748b"
                              secureTextEntry={true}
                              keyboardType="numeric"
                              value={enteredOwnerPin}
                              onChangeText={setEnteredOwnerPin}
                            />
                            {!isOwnerVerified ? (
                              <TouchableOpacity
                                style={[styles.submitBtn, { marginTop: 0, marginBottom: 0, padding: 8, backgroundColor: '#0284c7' }]}
                                onPress={() => handleVerifyOwnerPin(book.ownerPin)}
                              >
                                <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>확인 (주인 여부 판별)</Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={{ gap: 6, marginTop: 4 }}>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                  <TouchableOpacity
                                    style={[styles.submitBtn, { flex: 1, marginTop: 0, marginBottom: 0, padding: 8, backgroundColor: '#b45309' }]}
                                    onPress={() => executeLowerCondition(book.id, rep.id)}
                                  >
                                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>▲파손 확인 및 등급 내리기</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.submitBtn, { flex: 1, marginTop: 0, marginBottom: 0, padding: 8, backgroundColor: '#059669' }]}
                                    onPress={() => executeKeepCondition(book.id, rep.id)}
                                  >
                                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>허위신고 (등급 유지)</Text>
                                  </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                  style={[styles.submitBtn, { backgroundColor: '#475569', marginTop: 0, marginBottom: 0, padding: 8 }]}
                                  onPress={() => executeCancelReport(book.id, rep.id)}
                                >
                                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>잘못 누름 / 신고 취소하기</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                            <TouchableOpacity
                              style={{ alignItems: 'center', marginTop: 6, padding: 4 }}
                              onPress={() => {
                                setInputingPinForBookId(null);
                                setInputingReportId(null);
                                setEnteredOwnerPin('');
                                setIsOwnerVerified(false);
                              }}
                            >
                              <Text style={{ color: '#94a3b8', fontSize: 11 }}>닫기</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.lowerGradeBtn}
                            onPress={() => {
                              setInputingPinForBookId(book.id);
                              setInputingReportId(rep.id);
                              setEnteredOwnerPin('');
                              setIsOwnerVerified(false);
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>주인 고유비밀번호 입력하기</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* 빌리는 사람의 기능 세션 */}
            <Text style={styles.sectionCategoryHeader}>빌리는 사람의 기능 (대여 & 반납)</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity
  style={[styles.bigCard, styles.cardGreen]}
  onPress={() => {
    setRentStep('selectBook');
    setSelectedBookForRent(null);
    setSelectedRentalType(null);
    setSearchQuery('');
    
    // ▼ [추가] 대여 창을 여는 순간 서버에서 가장 최신의 도서 상태(대여 여부)를 즉시 불러옴!
    fetchBooks(); 

    setModalType('browse');
  }}
>
                <Text style={styles.cardIcon}>📖</Text>
                <Text style={styles.cardTitle}>도서 대여하기</Text>
                <Text style={styles.cardSub}>검색 기능 및 등급별/시간별 차감 적용{'\n'}(시간권 / 종일권)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bigCard, styles.cardPurple]}
                onPress={() => setModalType('returnBookModal')}
              >
                <Text style={styles.cardIcon}>🔄</Text>
                <Text style={styles.cardTitle}>도서 반납하기</Text>
                <Text style={styles.cardSub}>대여 중인 도서 선택 후{'\n'}지정된 보관함 반납</Text>
              </TouchableOpacity>
            </View>

            {/* 대여 중인 도서 및 실시간 잔여 시간 카운트다운 */}
            <View style={styles.borrowerSectionBox}>
              <Text style={{ color: '#f8fafc', fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>⏳ 대여 중인 도서 및 실시간 잔여 시간</Text>
              <Text style={{ color: '#f43f5e', fontSize: 11, fontWeight: 'bold', marginBottom: 8 }}>⚠️ 경고: 제한 시간 내 미반납 시 패널티가 부과됩니다.</Text>
              {books.filter((b) => b.borrower === currentUser.name).length > 0 ? (
  books.filter((b) => b.borrower === currentUser.name).map((b) => {
    // [핵심] 남은 시간이 3시간 초과면 무조건 종일권(24시간)으로 판별
    const isFullDay = b.initialHours === 24 || b.rentalTimeLeft > 10800;
    const displayHours = isFullDay ? 24 : b.initialHours;
    const maxTotalHours = displayHours + (isFullDay ? 0 : b.maxExtensions);

    return (
      <View key={b.id} style={styles.borrowerBookCard}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
            {b.title} ({isFullDay ? '종일권' : `${displayHours}시간권`})
          </Text>
          <Text style={{ color: '#f43f5e', fontSize: 13, fontWeight: 'bold', marginTop: 3 }}>
            잔여 시간: {formatTime(b.rentalTimeLeft)}
          </Text>
          <Text style={{ color: '#38bdf8', fontSize: 11, marginTop: 2 }}>
            {isFullDay ? '종일권 (연장 불가)' : `연장 횟수: ${b.extensionCount} / ${b.maxExtensions}회 (총 최대 ${maxTotalHours}시간)`}
          </Text>
        </View>

        {/* [핵심] 종일권이 아닐 때만 연장 버튼 표시 (종일권이면 버튼 아예 생성 안 됨) */}
        {!isFullDay && (
          <TouchableOpacity
            style={[
              styles.inlineExtendBtn,
              b.extensionCount >= b.maxExtensions && { backgroundColor: '#475569' }
            ]}
            onPress={() => handleExtendRental(b.id)}
            disabled={b.extensionCount >= b.maxExtensions}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
              {b.extensionCount >= b.maxExtensions ? '횟수 초과' : '1시간 연장'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  })
) : (
  <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', paddingVertical: 6 }}>
    현재 대여 중인 도서가 없습니다.
  </Text>
)}    
                <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', paddingVertical: 6 }}>현재 대여 중인 도서가 없습니다.</Text>
              
            </View>

            {/* 빌려주는 사람의 기능 세션 */}
            <Text style={[styles.sectionCategoryHeader, { marginTop: 15 }]}>빌려주는 사람의 기능 (보관 & 회수)</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.bigCard, styles.cardBlue]}
                onPress={() => setModalType('register')}
              >
                <Text style={styles.cardIcon}>📦</Text>
                <Text style={styles.cardTitle}>내 책 보관하기</Text>
                <Text style={styles.cardSub}>주인 이름 및 고유 비밀번호 설정{'\n'}실물 사진 및 UV-C 등록 (+100P)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bigCard, styles.cardOrange]}
                onPress={() => setModalType('retrieve')}
              >
                <Text style={styles.cardIcon}>📤</Text>
                <Text style={styles.cardTitle}>등록한 책 회수하기</Text>
                <Text style={styles.cardSub}>내가 보관한 책 직접 찾기{'\n'}리미트 스위치 OFF 해제</Text>
              </TouchableOpacity>
            </View>

            {/* 부가 시스템 및 관리 툴 */}
            <View style={[styles.toolsSection, { marginTop: 10 }]}>
              <Text style={styles.toolsHeader}>부가 시스템 및 관리 툴</Text>
              <View style={styles.toolsGrid}>
                <TouchableOpacity style={styles.toolBtn} onPress={() => setModalType('rentalCouponsModal')}>
                  <Text style={styles.toolBtnText}>🎫 도서 대여 쿠폰함 ({rentalCoupons.length}장)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => setModalType('gifticonCouponsModal')}>
                  <Text style={styles.toolBtnText}>🎁 포인트 변환 쿠폰함 ({exchangedGifticons.length}장)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={() => setModalType('referral')}>
                  <Text style={styles.toolBtnText}>👥 친구추천/공유</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolBtn} onPress={openReportModal}>
                  <Text style={styles.toolBtnText}>⚠️ 분실/파손 신고 접수</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={{ paddingVertical: 20 }}>
            <Text style={{ color: '#94a3b8', textAlign: 'center', fontSize: 13 }}>Explore 탭 대여 도서 현황을 준비 중입니다.</Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 네비게이션 바 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('home')}>
          <Text style={[styles.navText, currentTab === 'home' && styles.navTextActive]}>🏠 Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('explore')}>
          <Text style={[styles.navText, currentTab === 'explore' && styles.navTextActive]}>🔍 Explore</Text>
        </TouchableOpacity>
      </View>

      {/* 모달 팝업 영역 */}
      <Modal visible={modalType !== null} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {modalType === 'rentalCouponsModal' && (
              <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>도서 대여 쿠폰함</Text>
                <Text style={styles.modalDesc}>도서 대여 시 현금 대신 사용할 수 있는 대여권 및 스탬프 적립 쿠폰 목록입니다.</Text>
                <View style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>* 도서 대여 스탬프 현황 ({userStamps} / 10)</Text>
                  <View style={styles.stampGrid}>
                    {Array.from({ length: 10 }).map((_, index) => {
                      const isStamped = index < userStamps;
                      return (
                        <View key={index} style={[styles.stampCell, isStamped && styles.stampCellActive]}>
                          <Text style={[styles.stampText, isStamped && styles.stampTextActive]}>{isStamped ? '✔' : index + 1}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                {rentalCoupons.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {rentalCoupons.map((coupon) => (
                      <View key={coupon.id} style={styles.ticketCard}>
                        <Text style={{ color: '#f8fafc', fontSize: 13, fontWeight: 'bold' }}>{coupon.name}</Text>
                        <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>지급일시: {coupon.date}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 20 }}>보유 중인 도서 대여 쿠폰이 없습니다.</Text>
                )}
              </ScrollView>
            )}

            {modalType === 'gifticonCouponsModal' && (
              <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>포인트 변환 기프트콘 쿠폰함</Text>
                <Text style={styles.modalDesc}>포인트로 변환하여 획득한 혜택 쿠폰 목록입니다.</Text>
                {exchangedGifticons.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {exchangedGifticons.map((item) => (
                      <View key={item.id} style={[styles.ticketCard, { borderColor: '#38bdf8', borderWidth: 1 }]}>
                        <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: 'bold' }}>{item.name}</Text>
                        <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>{item.date}</Text>
                        <Text style={{ color: '#34d399', fontSize: 10, marginTop: 4 }}>* 제휴처 매장 직원에게 제시 후 사용하세요.</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 30 }}>보유 중인 기프트콘 혜택 쿠폰이 없습니다.</Text>
                )}
              </ScrollView>
            )}

            {modalType === 'exchangeGifticon' && (
              <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>포인트 기프트콘 교환소</Text>
                <Text style={styles.modalDesc}>모아둔 포인트를 학교 및 제휴 혜택으로 자유롭게 변환하세요!</Text>
                <View style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: '#38bdf8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold' }}>내 현재 보유 포인트</Text>
                  <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: 'bold' }}>{userPoints.toLocaleString()} P</Text>
                </View>
                <View style={{ gap: 10, marginBottom: 16 }}>
                  <TouchableOpacity style={styles.gifticonCard} onPress={() => handleExchangeGifticon('조선대 주차권 1시간 변경권')}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>조선대 주차권 1시간 변경하기</Text>
                      <Text style={{ color: '#93c5fd', fontSize: 11, marginTop: 4 }}>필요 포인트: 1,000 P</Text>
                    </View>
                    <View style={styles.exchangeActionBtn}><Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>교환하기</Text></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.gifticonCard} onPress={() => handleExchangeGifticon('조선대 후문 음료 1잔 무료 교환권')}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>조선대 후문 음료 1잔 무료</Text>
                      <Text style={{ color: '#6ee7b7', fontSize: 11, marginTop: 4 }}>필요 포인트: 1,000 P</Text>
                    </View>
                    <View style={[styles.exchangeActionBtn, { backgroundColor: '#059669' }]}><Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>교환하기</Text></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.gifticonCard} onPress={() => handleExchangeGifticon('조선대 정문 스터디카페 1시간 이용권')}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>조선대 정문 스터디카페 1시간 이용권</Text>
                      <Text style={{ color: '#fca5a5', fontSize: 11, marginTop: 4 }}>필요 포인트: 1,000 P</Text>
                    </View>
                    <View style={[styles.exchangeActionBtn, { backgroundColor: '#c2410c' }]}><Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>교환하기</Text></View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {modalType === 'browse' && (
              <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>도서 대여하기</Text>
                {rentStep === 'selectBook' ? (
                  <>
                    <Text style={styles.modalDesc}>1단계: 검색 기능을 사용하여 도서를 찾아보세요.</Text>
                    <TextInput
                      style={[styles.input, { marginBottom: 12 }]}
                      placeholder="🔍 책 제목, 저자, 소유자 검색"
                      placeholderTextColor="#64748b"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 6 }}>대여 가능한 도서 목록</Text>
                    {filteredAvailableBooks.map((b) => {
                      const p1h = calculateRequiredPoints(1, b.condition);
                      const p2h = calculateRequiredPoints(2, b.condition);
                      const pFull = calculateRequiredPoints(24, b.condition);
                      return (
                        <TouchableOpacity key={b.id} style={styles.modalBookItem} onPress={() => handleSelectBookItem(b)}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{b.title}</Text>
                            <Text style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: 12, backgroundColor: '#0f172a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>{b.condition}</Text>
                          </View>
                          <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>{b.storageNo} {b.lockerNo} (주인: {b.owner} / 저자: {b.author})</Text>
                          <Text style={{ color: '#34d399', fontSize: 10, marginTop: 4 }}>[차감] 1시간: {p1h}P | 2시간: {p2h}P | 종일권: {pFull}P</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {filteredAvailableBooks.length === 0 && (
                      <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 20 }}>대여 가능한 도서가 없습니다.</Text>
                    )}
                  </>
                ) : rentStep === 'selectType' ? (
                  <>
                    <Text style={styles.modalDesc}>2단계: 대여권 종류를 선택해주세요.</Text>
                    {(() => {
                      const cond = selectedBookForRent?.condition || 'S급';
                      const p1h = calculateRequiredPoints(1, cond);
                      const p2h = calculateRequiredPoints(2, cond);
                      const pFull = calculateRequiredPoints(24, cond);
                      return (
                        <>
                          <View style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: '#38bdf8' }}>
                            <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: 'bold' }}>선택한 도서 및 등급</Text>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>
                              {selectedBookForRent?.title} <Text style={{ color: '#34d399' }}>({cond})</Text>
                            </Text>
                          </View>
                          <View style={{ gap: 10, marginBottom: 16 }}>
                            <TouchableOpacity style={styles.rentalTypeOptionBtn} onPress={() => handleSelectRentalType({ name: '1시간 시간권', hours: 1, basePoints: p1h })}>
                              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>1시간 대여권 ({cond})</Text>
                              <Text style={{ color: '#93c5fd', fontSize: 11, marginTop: 2 }}>차감 포인트: {p1h} P</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.rentalTypeOptionBtn} onPress={() => handleSelectRentalType({ name: '2시간 시간권', hours: 2, basePoints: p2h })}>
                              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>2시간 대여권 ({cond})</Text>
                              <Text style={{ color: '#6ee7b7', fontSize: 11, marginTop: 2 }}>차감 포인트: {p2h} P</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.rentalTypeOptionBtn, { backgroundColor: '#7c2d12' }]} onPress={() => handleSelectRentalType({ name: '종일권', hours: 24, basePoints: pFull })}>
                              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>종일권 ({cond})</Text>
                              <Text style={{ color: '#fca5a5', fontSize: 11, marginTop: 2 }}>차감 포인트: {pFull} P (연장 불가)</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      );
                    })()}
                    <TouchableOpacity style={{ alignItems: 'center', padding: 8 }} onPress={() => setRentStep('selectBook')}>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>← 도서 다시 선택하기</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalDesc}>3단계: 결제 수단을 선택해주세요.</Text>
                    {(() => {
                      const totalCost = selectedRentalType ? selectedRentalType.basePoints : 100;
                      return (
                        <View style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: '#38bdf8' }}>
                          <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: 'bold' }}>최종 결제 내역</Text>
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>{selectedBookForRent?.title} ({selectedRentalType?.name})</Text>
                          <Text style={{ color: '#34d399', fontSize: 12, fontWeight: 'bold', marginTop: 2 }}>최종 차감 포인트: {totalCost} P</Text>
                        </View>
                      );
                    })()}
                    <View style={{ gap: 8, marginBottom: 16 }}>
                      <TouchableOpacity style={[styles.paymentOptionBtn, { backgroundColor: '#1d4ed8' }]} onPress={() => initiateRentProcess('points')}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>★ 포인트로 결제</Text>
                        <Text style={{ color: '#93c5fd', fontSize: 11, marginTop: 2 }}>보유 포인트: {userPoints} P</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.paymentOptionBtn, rentalCoupons.length > 0 ? { backgroundColor: '#065f46' } : { backgroundColor: '#334155', opacity: 0.6 }]}
                        onPress={() => {
                          if (rentalCoupons.length <= 0) {
                            Alert.alert('알림', '보유 중인 도서 대여 쿠폰이 없습니다.');
                            return;
                          }
                          initiateRentProcess('쿠폰');
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>보유 대여 쿠폰으로 결제하기</Text>
                        <Text style={{ color: '#6ee7b7', fontSize: 11, marginTop: 2 }}>쿠폰 1장 사용 (잔여: {rentalCoupons.length}장)</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={{ alignItems: 'center', padding: 8 }} onPress={() => setRentStep('selectType')}>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>← 대여권 종류 다시 선택하기</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            )}

            {modalType === 'returnBookModal' && (
              <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>도서 반납하기</Text>
                <Text style={styles.modalDesc}>현재 대여 중인 도서 중 반납할 책을 선택하세요.</Text>
                {books.filter((b) => b.borrower === currentUser.name).map((b) => (
                  <TouchableOpacity key={b.id} style={styles.modalBookItem} onPress={() => initiateReturnProcess(b.id)}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{b.title}</Text>
                    <Text style={{ color: '#38bdf8', fontSize: 12, marginTop: 2 }}>반납 위치: {b.storageNo} {b.lockerNo}</Text>
                  </TouchableOpacity>
                ))}
                {books.filter((b) => b.borrower === currentUser.name).length === 0 && (
                  <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 20 }}>현재 대여 중인 도서가 없습니다.</Text>
                )}
              </ScrollView>
            )}

            {modalType === 'register' && (
  <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
    <Text style={styles.modalTitle}>내 책 보관하기</Text>
    <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 6 }}>보관함 종류</Text>
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      {[
        { label: '제1보관함 (전공)', val: '제1보관함 (전공서적)' },
        { label: '제2보관함 (자격증)', val: '제2보관함 (자격증서적)' },
      ].map((sto) => (
        <TouchableOpacity
          key={sto.val}
          style={[styles.selectChip, selectedStorage === sto.val && styles.selectChipActive]}
          onPress={() => setSelectedStorage(sto.val)}
        >
          <Text style={[styles.selectChipText, selectedStorage === sto.val && { color: '#fff' }]}>{sto.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
    <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 6 }}>실시간 빈자리 현황</Text>
    <View style={styles.switchStatusBox}>
      {['1구역', '2구역', '3구역', '4구역', '5구역'].map((zone) => {
        const isOccupied = limitSwitches[`${selectedStorage}-${zone}`];
        return (
          <View key={zone} style={[styles.switchBadge, isOccupied ? styles.badgeOccupied : styles.badgeEmpty]}>
            <Text style={{ color: '#94a3b8', fontSize: 10 }}>{zone}</Text>
            <Text style={[styles.switchText, isOccupied ? { color: '#f43f5e' } : { color: '#34d399' }]}>
              {isOccupied ? '사용중' : '빈자리'}
            </Text>
          </View>
        );
      })}
    </View>
    <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 6, marginTop: 10 }}>도서 실물 사진 등록</Text>
    <View style={styles.imagePickerRow}>
      <Image source={{ uri: bookImageUri }} style={styles.previewImage} />
      <TouchableOpacity style={styles.imagePickBtn} onPress={handlePickSampleImage}>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>사진 촬영/가져오기</Text>
      </TouchableOpacity>
    </View>
    <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 6 }}>도서 등급</Text>
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
      {['S급', 'A급', 'B급', 'C급'].map((cond) => (
        <TouchableOpacity
          key={cond}
          style={[styles.selectChip, selectedCondition === cond && styles.selectChipActive]}
          onPress={() => setSelectedCondition(cond)}
        >
          <Text style={[styles.selectChipText, selectedCondition === cond && { color: '#fff' }]}>{cond}</Text>
        </TouchableOpacity>
      ))}
    </View>

    {/* 책 주인 이름은 로그인한 사용자 이름으로 자동 고정 표시 (수정 불가 또는 읽기 전용 느낌) */}
    <TextInput
      style={[styles.input, { backgroundColor: '#1e293b', color: '#38bdf8' }]}
      value={`책 주인: ${currentUser.name} (${currentUser.studentId})`}
      editable={false}
    />

    {/* 고유 비밀번호 입력 칸은 회원가입 정보(currentUser.pin)로 대체되므로 삭제 완료 */}

    <TextInput style={styles.input} placeholder="책 제목" placeholderTextColor="#64748b" value={newTitle} onChangeText={setNewTitle} />
    <TextInput style={styles.input} placeholder="저자" placeholderTextColor="#64748b" value={newAuthor} onChangeText={setNewAuthor} />
    <TextInput style={styles.input} placeholder="출판사" placeholderTextColor="#64748b" value={newPublisher} onChangeText={setNewPublisher} />
    
    <TouchableOpacity style={styles.submitBtn} onPress={initiateRegisterProcess}>
      <Text style={styles.submitBtnText}>빈자리 자동 배정 및 인증 시작</Text>
    </TouchableOpacity>
  </ScrollView>
)}

            {modalType === 'retrieve' && (
              <View>
                <Text style={styles.modalTitle}>등록한 책 회수하기</Text>
                {books.filter((b) => b.owner === currentUser.name).map((b) => (
                  <TouchableOpacity key={b.id} style={styles.modalBookItem} onPress={() => initiateRetrieveProcess(b.id)}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{b.title} ({b.status})</Text>
                    <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: 'bold', marginTop: 2 }}>{b.storageNo} {b.lockerNo}</Text>
                  </TouchableOpacity>
                ))}
                {books.filter((b) => b.owner === currentUser.name).length === 0 && (
                  <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 20 }}>회수할 도서가 없습니다.</Text>
                )}
              </View>
            )}

            {modalType === 'damageReport' && (
              <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>분실/파손 신고 접수</Text>
                <Text style={styles.modalDesc}>현재 대여 중인 도서 중 선택하여 책 주인에게 신고합니다.</Text>
                <View style={styles.reportDateBox}>
                  <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: 'bold' }}>실시간 신고 접수일시</Text>
                  <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>{reportCurrentDate}</Text>
                </View>
                <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 6 }}>신고할 대여 도서 선택</Text>
                <View style={{ gap: 6, marginBottom: 12 }}>
                  {books.filter((b) => b.borrower === currentUser.name).map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.selectChip, selectedBookForReport?.id === b.id && styles.selectChipActive, { padding: 10, alignItems: 'flex-start' }]}
                      onPress={() => setSelectedBookForReport(b)}
                    >
                      <Text style={[styles.selectChipText, selectedBookForReport?.id === b.id && { color: '#fff' }]}>
                        {b.title} (책 주인: {b.owner})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 6 }}>파손/분실 부위 사진 첨부</Text>
                <View style={styles.imagePickerRow}>
                  <Image source={{ uri: reportImageUri }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.imagePickBtn} onPress={handlePickReportImage}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>사진 첨부하기</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 6 }}>상세 내용 입력</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="파손 부위나 분실 경위를 상세히 적어주세요."
                  placeholderTextColor="#64748b"
                  multiline={true}
                  value={reportDetail}
                  onChangeText={setReportDetail}
                />
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitReport}>
                  <Text style={styles.submitBtnText}>책 주인에게 파손/분실 신고 전송하기</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {modalType === 'pinAuth' && (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={styles.modalTitle}>2단계 시퀀셜 보안 인증</Text>
                <View style={styles.bigHighlightBanner}>
                  <Text style={styles.bigHighlightLabel}>최종 배정 구역</Text>
                  <Text style={styles.bigHighlightText}>{highlightZone}</Text>
                </View>
                {authStep === 'step1_keypad' ? (
                  <View style={styles.pinContainer}>
                    <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: 'bold' }}>[1단계: 키패드 임시 인증번호]</Text>
                    <Text style={styles.pinText}>{step1Pin}</Text>
                    <TouchableOpacity style={[styles.submitBtn, { width: '100%', backgroundColor: '#0284c7', marginTop: 12, marginBottom: 0 }]} onPress={handleStep1KeypadSuccess}>
                      <Text style={styles.submitBtnText}>키패드 입력 완료 (사용자 판별)</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.pinContainer}>
                    <Text style={{ color: '#34d399', fontSize: 11, fontWeight: 'bold' }}>[2단계: 최종 보안 비밀번호]</Text>
                    <Text style={styles.pinText}>{step2Pin}</Text>
                    <TouchableOpacity style={[styles.submitBtn, { width: '100%', backgroundColor: '#059669', marginTop: 12, marginBottom: 0 }]} onPress={handleFinalDoorOpenConfirm}>
                      <Text style={styles.submitBtnText}>도어락 열림 확인 완료</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.timerBox}>
                  <Text style={styles.timerLabel}>남은 인증 시간 (1분 제한)</Text>
                  <Text style={styles.timerValue}>
                    {Math.floor(timeLeft / 60)}분 {timeLeft % 60 < 10 ? `0${timeLeft % 60}` : timeLeft % 60}초
                  </Text>
                </View>
              </View>
            )}

            {modalType === 'referral' && (
              <View>
                <Text style={styles.modalTitle}>친구 추천 이벤트</Text>
                <Text style={styles.modalDesc}>친구에게 내 추천 코드를 공유하고 보상을 받으세요!</Text>
                <View style={styles.myCodeBox}>
                  <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>내 추천 코드</Text>
                  <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: 'bold', letterSpacing: 2 }}>{myReferralCode}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 4 }}>친구 가입 시 입력하면 양방향 +100P & 쿠폰 지급!</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="친구의 추천 코드 입력"
                  placeholderTextColor="#64748b"
                  value={inputReferralCode}
                  onChangeText={setInputReferralCode}
                />
                <TouchableOpacity style={styles.submitBtn} onPress={handleApplyReferral}>
                  <Text style={styles.submitBtnText}>추천 코드 등록하고 보상 받기</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalType(null)}>
              <Text style={{ color: '#94a3b8', fontWeight: 'bold' }}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  // 로그인/회원가입 화면 스타일
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#0f172a' },
  authHeaderBox: { alignItems: 'center', marginBottom: 24 },
  authMainTitle: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center' },
  authSubTitle: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  authCard: { width: '100%', maxWidth: 380, backgroundColor: '#1e293b', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  authTabRow: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#0f172a', borderRadius: 8, padding: 4 },
  authTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  authTabBtnActive: { backgroundColor: '#2563eb' },
  authTabText: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold' },
  authTabTextActive: { color: '#fff' },

  // 기존 헤더 및 기타 스타일
  header: { padding: 16, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  headerBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  headerSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  logoutBtn: { backgroundColor: '#b91c1c', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  pointCard: { marginTop: 12, backgroundColor: '#0f172a', padding: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pointCardLabel: { color: '#fbbf24', fontSize: 12, fontWeight: 'bold' },
  pointCardValue: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold' },
  exchangeHeaderBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  scrollContent: { padding: 16 },
  sectionCategoryHeader: { color: '#38bdf8', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  actionGrid: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  bigCard: { flex: 1, padding: 16, borderRadius: 16, justifyContent: 'space-between', height: 120 },
  cardGreen: { backgroundColor: '#065f46' },
  cardBlue: { backgroundColor: '#1d4ed8' },
  cardPurple: { backgroundColor: '#5b21b6' },
  cardOrange: { backgroundColor: '#c2410c' },
  cardIcon: { fontSize: 22, marginBottom: 4 },
  cardTitle: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  cardSub: { color: '#cbd5e1', fontSize: 10, marginTop: 4, lineHeight: 14 },
  borrowerSectionBox: { backgroundColor: '#1e293b', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  borrowerBookCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', padding: 10, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: '#334155' },
  inlineExtendBtn: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  notificationAlertBox: { backgroundColor: '#78350f', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b', marginBottom: 12 },
  lowerGradeBtn: { backgroundColor: '#b45309', padding: 8, borderRadius: 6, alignItems: 'center', marginTop: 6 },
  toolsSection: { marginTop: 4 },
  toolsHeader: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolBtn: { width: '48%', backgroundColor: '#1e293b', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  toolBtnText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  navBar: { flexDirection: 'row', backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155', paddingVertical: 10 },
  navItem: { flex: 1, alignItems: 'center' },
  navText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  navTextActive: { color: '#38bdf8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  modalDesc: { color: '#94a3b8', fontSize: 12, marginBottom: 12, lineHeight: 16 },
  modalBookItem: { backgroundColor: '#334155', padding: 12, borderRadius: 8, marginBottom: 8 },
  rentalTypeOptionBtn: { backgroundColor: '#1d4ed8', padding: 14, borderRadius: 10 },
  paymentOptionBtn: { padding: 14, borderRadius: 10, alignItems: 'center' },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 12, color: '#f8fafc', marginBottom: 10, fontSize: 13 },
  submitBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  submitBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  closeBtn: { alignItems: 'center', marginTop: 10, padding: 8 },
  selectChip: { flex: 1, paddingVertical: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 6, alignItems: 'center' },
  selectChipActive: { backgroundColor: '#2563eb', borderColor: '#38bdf8' },
  selectChipText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
  imagePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: '#0f172a', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  previewImage: { width: 50, height: 65, borderRadius: 6, backgroundColor: '#334155' },
  imagePickBtn: { flex: 1, backgroundColor: '#334155', padding: 12, borderRadius: 6, alignItems: 'center' },
  switchStatusBox: { backgroundColor: '#0f172a', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', gap: 6, marginBottom: 12 },
  switchBadge: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  badgeEmpty: { backgroundColor: '#065f46' },
  badgeOccupied: { backgroundColor: '#4c0519' },
  switchText: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  reportDateBox: { backgroundColor: '#0f172a', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#38bdf8' },
  bigHighlightBanner: { backgroundColor: '#0f172a', width: '100%', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: '#38bdf8' },
  bigHighlightLabel: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  bigHighlightText: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', textAlign: 'center', lineHeight: 24 },
  pinContainer: { backgroundColor: '#0f172a', width: '100%', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  pinText: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold', letterSpacing: 4, marginTop: 4 },
  timerBox: { backgroundColor: '#1e1b4b', width: '100%', padding: 8, borderRadius: 10, alignItems: 'center', marginBottom: 4, borderWidth: 1, borderColor: '#4338ca' },
  timerLabel: { color: '#c7d2fe', fontSize: 10, fontWeight: 'bold' },
  timerValue: { color: '#f43f5e', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, justifyContent: 'center' },
  stampCell: { width: '18%', aspectRatio: 1, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  stampCellActive: { backgroundColor: '#065f46', borderColor: '#34d399' },
  stampText: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  stampTextActive: { color: '#34d399', fontSize: 10 },
  ticketCard: { backgroundColor: '#334155', padding: 12, borderRadius: 8 },
  myCodeBox: { backgroundColor: '#0f172a', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#38bdf8' },
  gifticonCard: { backgroundColor: '#1e293b', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  exchangeActionBtn: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
});