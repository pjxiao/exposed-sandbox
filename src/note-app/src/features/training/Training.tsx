import React, { useState } from "react";
import { Button, Container, Row, Col, Navbar, Form, FormControl, Nav, Card, ListGroup } from "react-bootstrap";
import { useSelector, useDispatch } from "react-redux";
import { NativeText } from "../../components/NativeText";
import { list } from "../../repositories/SpreadsheetRepository";
import {
    selectState,
    selectCurrent,
    openSpreadsheet,
    next,
    prev,
    toggleVisibility,
    post,
    clearState,
} from "./trainingSlice";


const TrainingList = () => {
    const dispatch = useDispatch();
    const [spreadsheetId, setSpreadsheetId] = useState('');

    const sheets = list();
    return (
        <>
        <Navbar variant="dark" bg="dark">
            <Form inline>
                <FormControl
                    type="text"
                    value={spreadsheetId}
                    className="mr-sm-2"
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                />
                <Button
                    variant="outline-info"
                    onClick={() => dispatch(post(spreadsheetId))}
                >Load</Button>
            </Form>
        </Navbar>
        <ListGroup>
            {sheets.map((sheet, i) => (
                <ListGroup.Item
                    key={i}
                    action
                    variant='flash'
                    onClick={() => dispatch(openSpreadsheet(sheet.spreadsheetId))}
                >{sheet.title}</ListGroup.Item>
            ))}
        </ListGroup>
        </>
    );
};


export function TrainingDetail() {
    const {spreadsheetId, visibility, state} = useSelector(selectState);
    const current = useSelector(selectCurrent);
    const dispatch = useDispatch();
    return (
        <>
            <header>
                <Navbar variant="dark" bg="dark" className="overflow-auto">
                    <Navbar.Brand>{spreadsheetId}</Navbar.Brand>
                    <Nav>
                        <Nav.Link onClick={() => dispatch(clearState())}>LIST</Nav.Link>
                    </Nav>
                </Navbar>
            </header>
            <Container fluid className="mb-5">
                {(() => {switch (state) {
                    case 'READY': {return (
                        <Row><Col>
                            <p>^ INPUT SPREADSHEET ID</p>
                        </Col></Row>
                    );}
                    case 'LOADING': {return (
                        <Row><Col>
                            <p>LOADING</p>
                        </Col></Row>
                    );}
                    case 'FAILED': {return (
                        <Row><Col>
                            <p>FAILED</p>
                        </Col></Row>
                    );}
                    case 'LOADED': {return (
                        <Row><Col>
                            <Card className="mt-3">
                                <Card.Header>JA</Card.Header>
                                <Card.Body>{current?.ja}</Card.Body>
                            </Card>
                            <Card className="mt-3">
                                <Card.Header>EN</Card.Header>
                                <Card.Body className={visibility === 'SHOWN' ? 'vibible' : 'invisible'}>
                                    <NativeText className="text-body">{current?.en}</NativeText>
                                </Card.Body>
                            </Card>
                            <Card className="mt-3">
                                <Card.Header>NOTE</Card.Header>
                                <Card.Body className={visibility === 'SHOWN' ? 'vibible' : 'invisible'}>
                                    <NativeText className="text-body">{current?.note || 'n/a'}</NativeText>
                                </Card.Body>
                            </Card>
                        </Col></Row>
                    );}
                }})()}
            </Container>
            <Navbar fixed="bottom" variant="dark" bg="dark">
                <Container fluid>
                    <Nav className="ms-auto">
                        <Button
                            variant="outline-info"
                            onClick={() => dispatch(prev())}
                        >Prev</Button>
                    </Nav>
                    <Nav className="me-auto ms-auto">
                        <Button
                            variant="outline-info"
                            onClick={() => dispatch(toggleVisibility())}
                        >TOGGLE ANSWER</Button>
                    </Nav>
                    <Nav className="me-auto">
                        <Button
                            className="me-auto"
                            variant="outline-info"
                            onClick={() => dispatch(next())}
                        >Next</Button>
                    </Nav>
                </Container>
            </Navbar>
        </>
    );

};


export function Training() {
    const {spreadsheetId} = useSelector(selectState);
    if (spreadsheetId === null) {
        return (<TrainingList/>);
    } else {
        return (<TrainingDetail />);
    }


};
